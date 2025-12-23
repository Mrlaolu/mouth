#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TTS服务类，封装PaddleSpeech调用
"""

import logging
import tempfile
import os
import time
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
        # 记录总开始时间
        total_start_time = time.time()
        logger.debug(f"TTS服务开始处理请求，文本长度: {len(text)}, 输出格式: {output_format}")
        
        try:
            # 1. 参数校验阶段
            param_start = time.time()
            if not text or not text.strip():
                raise ValueError("文本不能为空")
            
            # 限制文本长度
            if len(text) > 1000:
                raise ValueError("文本长度不能超过1000字符")
            
            # 参数校验
            speed = max(0.5, min(2.0, float(speed)))
            volume = max(0.0, min(1.0, float(volume)))
            pitch = max(0.5, min(2.0, float(pitch)))
            param_end = time.time()
            param_time = (param_end - param_start) * 1000
            logger.debug(f"参数校验完成 - 耗时: {param_time:.2f}ms")
            
            # 2. 临时文件创建阶段
            file_start = time.time()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
            file_end = time.time()
            file_time = (file_end - file_start) * 1000
            logger.debug(f"临时文件创建完成 - 耗时: {file_time:.2f}ms, 文件路径: {temp_path}")
            
            # 3. 语音合成核心阶段
            tts_start = time.time()
            logger.debug(f"开始调用PaddleSpeech合成语音")
            
            # 直接调用TTSExecutor，使用正确的模型参数
            # 使用支持的男声模型
            self.tts_executor(text=text, 
                            output=temp_path,
                            am='fastspeech2_male',
                            voc='pwgan_male',
                            lang='zh',
                            spk_id=0)
            
            tts_end = time.time()
            tts_time = (tts_end - tts_start) * 1000
            logger.debug(f"语音合成完成 - 耗时: {tts_time:.2f}ms")
            
            # 4. 音频处理阶段
            audio_start = time.time()
            logger.debug(f"开始音频处理")
            
            # 直接返回原始WAV文件，跳过所有音频处理
            # 只有在明确需要时才进行处理
            export_format = "wav"
            audio_content = None
            
            # 快速路径：如果没有调整参数且格式为wav，直接返回
            if speed == 1.0 and volume == 1.0 and pitch == 1.0 and output_format.lower() == "wav":
                logger.debug(f"使用快速路径，直接返回原始WAV文件")
                with open(temp_path, "rb") as f:
                    audio_content = f.read()
                logger.debug(f"读取文件内容完成 - 大小: {len(audio_content)}字节")
            else:
                logger.debug(f"使用慢速路径，需要调整参数或转换格式")
                # 慢速路径：需要调整参数或转换格式
                audio = AudioSegment.from_wav(temp_path)
                logger.debug(f"加载音频文件完成 - 时长: {len(audio)/1000}秒")
                
                # 调整音量
                if volume != 1.0:
                    vol_start = time.time()
                    audio = audio.apply_gain(volume * 20 - 20)
                    vol_end = time.time()
                    logger.debug(f"音量调整完成 - 耗时: {(vol_end - vol_start)*1000:.2f}ms")
                
                # 调整音调
                if pitch != 1.0:
                    pitch_start = time.time()
                    new_sample_rate = int(audio.frame_rate * (pitch ** 0.5))
                    audio = audio._spawn(audio.raw_data, overrides={'frame_rate': new_sample_rate})
                    audio = audio.set_frame_rate(24000)
                    pitch_end = time.time()
                    logger.debug(f"音调调整完成 - 耗时: {(pitch_end - pitch_start)*1000:.2f}ms")
                
                # 调整语速
                if speed != 1.0:
                    speed_start = time.time()
                    audio = audio.speedup(playback_speed=speed)
                    speed_end = time.time()
                    logger.debug(f"语速调整完成 - 耗时: {(speed_end - speed_start)*1000:.2f}ms")
                
                # 转换格式
                export_format = output_format.lower()
                if export_format == "mp3":
                    mp3_start = time.time()
                    # 直接导出到内存流
                    from io import BytesIO
                    mp3_stream = BytesIO()
                    audio.export(mp3_stream, format="mp3")
                    mp3_stream.seek(0)
                    audio_content = mp3_stream.read()
                    mp3_end = time.time()
                    logger.debug(f"MP3格式转换完成 - 耗时: {(mp3_end - mp3_start)*1000:.2f}ms, 大小: {len(audio_content)}字节")
                else:
                    wav_start = time.time()
                    # 覆盖原始文件
                    audio.export(temp_path, format="wav")
                    with open(temp_path, "rb") as f:
                        audio_content = f.read()
                    wav_end = time.time()
                    logger.debug(f"WAV格式保存完成 - 耗时: {(wav_end - wav_start)*1000:.2f}ms, 大小: {len(audio_content)}字节")
            
            audio_end = time.time()
            audio_time = (audio_end - audio_start) * 1000
            logger.debug(f"音频处理完成 - 总耗时: {audio_time:.2f}ms")
            
            # 5. 清理阶段
            cleanup_start = time.time()
            os.unlink(temp_path)
            cleanup_end = time.time()
            cleanup_time = (cleanup_end - cleanup_start) * 1000
            logger.debug(f"临时文件清理完成 - 耗时: {cleanup_time:.2f}ms")
            
            # 6. 总耗时统计
            total_end_time = time.time()
            total_time = (total_end_time - total_start_time) * 1000
            logger.info(f"TTS服务处理完成 - 总耗时: {total_time:.2f}ms")
            logger.info(f"各阶段耗时统计：")
            logger.info(f"  - 参数校验: {param_time:.2f}ms")
            logger.info(f"  - 文件操作: {file_time:.2f}ms")
            logger.info(f"  - 语音合成: {tts_time:.2f}ms (占比: {(tts_time/total_time)*100:.1f}%)")
            logger.info(f"  - 音频处理: {audio_time:.2f}ms (占比: {(audio_time/total_time)*100:.1f}%)")
            logger.info(f"  - 清理操作: {cleanup_time:.2f}ms")
            
            return temp_path, export_format, audio_content
                
        except Exception as e:
            # 记录异常情况下的总耗时
            total_end_time = time.time()
            total_time = (total_end_time - total_start_time) * 1000
            logger.error(f"语音合成失败 - 总耗时: {total_time:.2f}ms, 错误: {str(e)}")
            
            # 清理临时文件
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.debug(f"清理临时文件: {temp_path}")
            raise
