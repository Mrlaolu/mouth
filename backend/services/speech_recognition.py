import os
import wave
from vosk import Model, KaldiRecognizer
import json
from typing import Tuple

class SpeechRecognitionService:
    """语音识别服务（基于Vosk）"""
    
    def __init__(self, model_path: str = 'model'):
        self.model_path = model_path
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """加载Vosk模型"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Vosk模型文件未找到: {self.model_path}")
        
        self.model = Model(self.model_path)
    
    def recognize_from_wav(self, audio_data: bytes) -> str:
        """
        从WAV音频数据中识别文字
        
        Args:
            audio_data: WAV格式音频数据
            
        Returns:
            str: 识别结果
        """
        # 保存音频数据到临时文件
        temp_wav = "temp_recording.wav"
        with open(temp_wav, "wb") as f:
            f.write(audio_data)
        
        try:
            # 读取WAV文件
            wf = wave.open(temp_wav, "rb")
            
            # 检查音频格式
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
                raise ValueError("音频格式必须为: 单声道, 16位, 16000Hz")
            
            # 创建识别器
            recognizer = KaldiRecognizer(self.model, wf.getframerate())
            recognizer.SetWords(True)
            
            # 识别音频
            result = ""
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if recognizer.AcceptWaveform(data):
                    part_result = json.loads(recognizer.Result())
                    result += part_result.get("text", "")
            
            # 获取最终结果
            final_result = json.loads(recognizer.FinalResult())
            result += final_result.get("text", "")
            
            return result.strip()
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_wav):
                os.remove(temp_wav)
    
    def recognize_from_stream(self, audio_stream) -> str:
        """
        从音频流中识别文字
        
        Args:
            audio_stream: 音频流对象
            
        Returns:
            str: 识别结果
        """
        recognizer = KaldiRecognizer(self.model, 16000)
        recognizer.SetWords(True)
        
        result = ""
        while True:
            data = audio_stream.read(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                part_result = json.loads(recognizer.Result())
                result += part_result.get("text", "")
        
        final_result = json.loads(recognizer.FinalResult())
        result += final_result.get("text", "")
        
        return result.strip()
