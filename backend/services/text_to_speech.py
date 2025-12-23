import os
import tempfile
from paddlespeech.cli.tts.infer import TTSExecutor
from typing import Tuple

class TextToSpeechService:
    """文字转语音服务（基于PaddleSpeech）"""
    
    def __init__(self, 
                 speaker: str = 'zhiyuan',
                 speed: float = 1.0,
                 volume: float = 1.0,
                 pitch: float = 1.0):
        self.speaker = speaker
        self.speed = speed
        self.volume = volume
        self.pitch = pitch
        self.tts = TTSExecutor()
    
    def synthesize_speech(self, 
                          text: str, 
                          output_format: str = 'wav',
                          speed: float = None,
                          volume: float = None,
                          pitch: float = None) -> bytes:
        """
        将文字合成为语音
        
        Args:
            text: 要合成的文字
            output_format: 输出音频格式
            speed: 语速（0.5-2.0）
            volume: 音量（0.5-2.0）
            pitch: 语调（0.5-2.0）
            
        Returns:
            bytes: 音频数据
        """
        # 使用提供的参数或默认值
        current_speed = speed or self.speed
        current_volume = volume or self.volume
        current_pitch = pitch or self.pitch
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix=f'.{output_format}', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            # 使用PaddleSpeech合成语音
            self.tts(
                text=text,
                output=temp_filename,
                am='fastspeech2_zh-cn_zhiyuan_aishell3_ckpt_1.1.0',
                spk_id=0,
                voc='hifigan_zh-cn_aishell3_ckpt_1.1.0',
                lang='zh-cn',
                speed=current_speed,
                volume=current_volume,
                pitch=current_pitch
            )
            
            # 读取音频数据
            with open(temp_filename, 'rb') as f:
                audio_data = f.read()
            
            return audio_data
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
    
    def get_speaker_list(self) -> list:
        """
        获取可用的发音人列表
        
        Returns:
            list: 发音人列表
        """
        # PaddleSpeech的发音人列表
        return [
            'zhiyuan',
            'aishell3',
            'p225',
            'p226',
            'p227',
            'p228',
            'p229',
            'p230',
            'p231',
            'p232'
        ]
