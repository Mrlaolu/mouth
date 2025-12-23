from flask import Blueprint, request, jsonify, send_file
from services.text_to_speech import TextToSpeechService
import io
import logging

# 创建蓝图
tts_bp = Blueprint('tts', __name__)

# 初始化文字转语音服务
tts_service = TextToSpeechService()

@tts_bp.route('/tts', methods=['POST'])
def text_to_speech():
    """
    文字转语音接口
    
    请求体：
    {"text": "要合成的文字", "speed": 1.0, "volume": 1.0, "pitch": 1.0}
    
    响应：音频文件
    """
    try:
        # 获取请求数据
        data = request.get_json()
        text = data.get('text')
        speed = data.get('speed')
        volume = data.get('volume')
        pitch = data.get('pitch')
        
        # 验证请求数据
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # 验证参数范围
        def validate_param(name, value, min_val, max_val):
            if value is not None:
                if not (min_val <= value <= max_val):
                    return jsonify({
                        'error': f'Invalid {name} value',
                        'message': f'{name} must be between {min_val} and {max_val}'
                    }), 400
            return None
        
        # 验证各参数
        param_errors = [
            validate_param('speed', speed, 0.5, 2.0),
            validate_param('volume', volume, 0.5, 2.0),
            validate_param('pitch', pitch, 0.5, 2.0)
        ]
        
        # 检查是否有参数错误
        for error in param_errors:
            if error:
                return error
        
        # 合成语音
        audio_data = tts_service.synthesize_speech(
            text=text,
            speed=speed,
            volume=volume,
            pitch=pitch
        )
        
        # 将音频数据转换为文件对象
        audio_stream = io.BytesIO(audio_data)
        audio_stream.seek(0)
        
        # 返回音频文件
        return send_file(
            audio_stream,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='speech.wav'
        )
        
    except Exception as e:
        logging.error(f"TTS处理错误: {e}")
        return jsonify({
            'error': '语音合成失败',
            'details': str(e)
        }), 500

@tts_bp.route('/tts/speakers', methods=['GET'])
def get_speakers():
    """
    获取可用发音人列表
    
    响应：{"speakers": ["speaker1", "speaker2", ...]}
    """
    try:
        speakers = tts_service.get_speaker_list()
        return jsonify({'speakers': speakers}), 200
    except Exception as e:
        logging.error(f"获取发音人列表错误: {e}")
        return jsonify({
            'error': '获取发音人列表失败',
            'details': str(e)
        }), 500
