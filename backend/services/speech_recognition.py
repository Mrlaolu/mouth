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
        self.model_loaded = False
        try:
            self._load_model()
        except FileNotFoundError as e:
            # 模型文件不存在，不抛出异常，等到实际需要识别时再处理
            print(f"警告: Vosk模型文件未找到: {self.model_path}")
            print("请下载Vosk模型并放置在正确的路径，或者使用其他语音识别服务")
            print("模型下载地址: https://alphacephei.com/vosk/models")
    
    def _load_model(self):
        """加载Vosk模型"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Vosk模型文件未找到: {self.model_path}")
        
        self.model = Model(self.model_path)
        self.model_loaded = True
    
    def recognize_from_wav(self, audio_data: bytes) -> str:
        """
        从WAV音频数据中识别文字
        
        Args:
            audio_data: WAV格式音频数据
            
        Returns:
            str: 识别结果
        """
        # 检查模型是否加载
        if not self.model_loaded:
            return "语音识别模型未加载，请下载并配置Vosk模型"
        
        # 使用唯一的临时文件名，避免冲突
        import uuid
        temp_wav = f"temp_recording_{uuid.uuid4()}.wav"
        wf = None
        
        try:
            # 保存音频数据到临时文件
            with open(temp_wav, "wb") as f:
                f.write(audio_data)
            
            # 读取WAV文件
            wf = wave.open(temp_wav, "rb")
            
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
            
        except Exception as e:
            print(f"语音识别错误: {e}")
            return f"语音识别失败: {str(e)}"
        finally:
            # 确保关闭文件句柄
            if wf:
                wf.close()
            # 清理临时文件
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except:
                    # 如果删除失败，忽略错误
                    pass
    
    def recognize_from_stream(self, audio_stream) -> str:
        """
        从音频流中识别文字
        
        Args:
            audio_stream: 音频流对象
            
        Returns:
            str: 识别结果
        """
        # 检查模型是否加载
        if not self.model_loaded:
            return "语音识别模型未加载，请下载并配置Vosk模型"
        
        try:
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
        except Exception as e:
            print(f"语音识别错误: {e}")
            return f"语音识别失败: {str(e)}"
