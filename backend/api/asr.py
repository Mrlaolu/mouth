from flask import Blueprint, request, jsonify, Response
from services.speech_recognition import SpeechRecognitionService
import logging

# 创建蓝图
asr_bp = Blueprint('asr', __name__)

# 初始化语音识别服务
# 注意：需要确保Vosk模型已正确下载并放置在指定路径
# 如果模型路径不存在，服务将在首次请求时抛出异常

@asr_bp.route('/asr', methods=['POST'])
def speech_to_text():
    """
    语音转文字接口
    
    请求：音频文件（WAV格式）
    响应：{"text": "识别结果"}
    """
    try:
        # 检查是否有文件上传
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # 检查文件是否为空
        if audio_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # 读取音频数据
        audio_data = audio_file.read()
        
        # 初始化语音识别服务
        # 这里在请求时初始化，以便在模型不存在时能够给出明确错误
        asr_service = SpeechRecognitionService()
        
        # 识别语音
        text = asr_service.recognize_from_wav(audio_data)
        
        return jsonify({'text': text}), 200
        
    except FileNotFoundError as e:
        logging.error(f"ASR模型文件未找到: {e}")
        return jsonify({
            'error': 'ASR模型文件未找到',
            'message': '请确保Vosk模型已正确下载并放置在指定路径',
            'details': str(e)
        }), 500
        
    except ValueError as e:
        logging.error(f"音频格式错误: {e}")
        return jsonify({
            'error': '音频格式错误',
            'message': '请使用正确的音频格式：单声道, 16位, 16000Hz',
            'details': str(e)
        }), 400
        
    except Exception as e:
        logging.error(f"ASR处理错误: {e}")
        return jsonify({
            'error': '语音识别失败',
            'details': str(e)
        }), 500
