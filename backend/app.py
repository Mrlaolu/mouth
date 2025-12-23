import logging
from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
from tts_service import TTSService

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tts_service.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)

# 开启调试模式
app.debug = True

# 配置CORS，允许来自http://localhost:8000和http://127.0.0.1:8000的跨域请求
CORS(app, 
     origins=[
         'http://localhost:8000',
         'http://127.0.0.1:8000'
     ],
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['*'],
     supports_credentials=True)

# 初始化TTS服务
tts_service = TTSService()

# 简单的根路径
@app.route('/', methods=['GET', 'OPTIONS'])
def root():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({'message': 'AI Chat API is running'})

# AI对话接口
@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # 简单的AI模拟响应
        return jsonify({
            'reply': f'你好！你说的是：{message}',
            'dialogue_id': 'test-123'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 语音合成接口（TTS）
@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def tts():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # 获取请求参数
        speed = data.get('speed', 1.0)
        volume = data.get('volume', 1.0)
        pitch = data.get('pitch', 1.0)
        output_format = data.get('format', 'wav')
        
        # 调用TTS服务
        logger.info(f"收到TTS请求，文本长度: {len(text)}, 输出格式: {output_format}")
        _, format, audio_content = tts_service.text_to_speech(
            text=text,
            speed=speed,
            volume=volume,
            pitch=pitch,
            output_format=output_format
        )
        
        logger.info(f"TTS请求处理完成，音频大小: {len(audio_content)}字节")
        
        # 设置Content-Type
        content_type = "audio/wav" if format == "wav" else "audio/mpeg"
        
        # 返回音频文件流，设置为inline以便浏览器播放
        return Response(
            audio_content,
            mimetype=content_type,
            headers={
                'Content-Disposition': f'inline; filename=tts_output.{format}',
                'Content-Length': len(audio_content),
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except ValueError as e:
        logger.error(f"TTS请求参数错误: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"TTS服务错误: {str(e)}", exc_info=True)
        return jsonify({'error': '语音合成失败，请稍后重试'}), 500

# 语音识别接口（ASR）
@app.route('/api/asr', methods=['POST', 'OPTIONS'])
def asr():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # 检查是否有文件上传
        if 'audio' not in request.files:
            return jsonify({'error': 'Audio file is required'}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # 这里应该调用ASR服务，现在返回模拟响应
        return jsonify({'text': '语音识别服务未实现', 'confidence': 0.0}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 打印所有注册的路由
@app.route('/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'rule': str(rule),
            'methods': list(rule.methods)
        })
    return jsonify({'routes': routes})

if __name__ == '__main__':
    # 启动服务器
    app.run(host='127.0.0.1', port=5000)