from flask import Blueprint, request, jsonify
from services.ai_simulation import AISimulationService

# 创建蓝图
chat_bp = Blueprint('chat', __name__)

# 初始化AI模拟服务
ai_service = AISimulationService()

@chat_bp.route('/chat', methods=['POST'])
def chat():
    """
    AI对话接口
    
    请求体：
    {"message": "用户消息", "context": [...], "dialogue_id": "xxx"}
    
    响应：
    {"reply": "AI回复", "dialogue_id": "xxx"}
    """
    try:
        # 获取请求数据
        data = request.get_json()
        message = data.get('message')
        context = data.get('context', [])
        dialogue_id = data.get('dialogue_id')
        
        # 验证请求数据
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # 处理对话请求
        response = ai_service.process_chat(message, context, dialogue_id)
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
