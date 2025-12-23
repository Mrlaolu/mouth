from flask import Flask, jsonify, request
from flask_cors import CORS

# 创建Flask应用
app = Flask(__name__)

# 配置CORS，允许来自http://localhost:8000的跨域请求
CORS(app, 
     origins=['http://localhost:8000'],
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['*'],
     supports_credentials=True)

# 健康检查端点
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'AI Chat API',
        'version': '1.0.0'
    })

# 直接API测试路由
@app.route('/api/test', methods=['GET', 'POST', 'OPTIONS'])
def api_test():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({
        'message': 'API test successful',
        'endpoint': '/api/test',
        'method': request.method
    })

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
