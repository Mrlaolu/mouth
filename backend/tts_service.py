#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TTS服务类，封装PaddleSpeech调用
"""

import logging
import tempfile
import os
from pydub import AudioSegment
from paddlespeech.cli.tts.infer import TTSExecutor

logger = logging.getLogger(__name__)

class TTSService:
    """
    TTS服务类，用于将文本转换为语音
    """
    
    def __init__(self):
        """
        初始化TTS服务
        """
        self.tts_executor = TTSExecutor()
        # 配置男声模型
        self.default_params = {
            'am': 'fastspeech2_male',
            'voc': 'pwgan_male',
            'lang': 'zh',
            'spk_id': 0,
            'sample_rate': 24000
        }
        logger.info("TTS服务初始化完成")
    
    def text_to_speech(self, text, speed=1.0, volume=1.0, pitch=1.0, output_format="wav"):
        """
        将文本转换为语音
        
        Args:
            text: 待合成文本
            speed: 语速，范围0.5-2.0，默认1.0
            volume: 音量，范围0.0-1.0，默认1.0
            pitch: 音调，范围0.5-2.0，默认1.0
            output_format: 输出格式，支持wav和mp3，默认wav
        
        Returns:
            tuple: (音频文件路径, 音频格式, 音频内容)
        """
        try:
            if not text or not text.strip():
                raise ValueError("文本不能为空")
            
            # 限制文本长度
            if len(text) > 1000:
                raise ValueError("文本长度不能超过1000字符")
            
            # 参数校验
            speed = max(0.5, min(2.0, float(speed)))
            volume = max(0.0, min(1.0, float(volume)))
            pitch = max(0.5, min(2.0, float(pitch)))
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                temp_wav_path = temp_wav.name
            
            logger.info(f"开始合成语音，文本长度: {len(text)}, 语速: {speed}, 音量: {volume}, 音调: {pitch}")
            
            # 使用PaddleSpeech合成语音
            self.tts_executor(text=text,
                            output=temp_wav_path,
                            am=self.default_params['am'],
                            voc=self.default_params['voc'],
                            lang=self.default_params['lang'],
                            spk_id=self.default_params['spk_id'])
            
            logger.info(f"语音合成完成，临时文件: {temp_wav_path}")
            
            # 调整音量
            audio = AudioSegment.from_wav(temp_wav_path)
            audio = audio.apply_gain(volume * 20 - 20)  # 将0-1映射到-20dB到0dB
            
            # 调整音调
            new_sample_rate = int(audio.frame_rate * (pitch ** 0.5))
            audio = audio._spawn(audio.raw_data, overrides={'frame_rate': new_sample_rate})
            audio = audio.set_frame_rate(self.default_params['sample_rate'])  # 保持原始采样率
            
            # 根据输出格式转换
            if output_format.lower() == "mp3":
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                    temp_mp3_path = temp_mp3.name
                
                audio.export(temp_mp3_path, format="mp3")
                logger.info(f"音频格式转换完成，MP3文件: {temp_mp3_path}")
                
                # 读取文件内容
                with open(temp_mp3_path, "rb") as f:
                    audio_content = f.read()
                
                # 清理临时文件
                os.unlink(temp_wav_path)
                os.unlink(temp_mp3_path)
                
                return temp_mp3_path, "mp3", audio_content
            else:
                # 保存调整后的WAV文件
                audio.export(temp_wav_path, format="wav")
                
                # 读取文件内容
                with open(temp_wav_path, "rb") as f:
                    audio_content = f.read()
                
                # 清理临时文件
                os.unlink(temp_wav_path)
                
                return temp_wav_path, "wav", audio_content
                
        except Exception as e:
            logger.error(f"语音合成失败: {str(e)}")
            # 清理临时文件
            if 'temp_wav_path' in locals() and os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
            if 'temp_mp3_path' in locals() and os.path.exists(temp_mp3_path):
                os.unlink(temp_mp3_path)
            raise
