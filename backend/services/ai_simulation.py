import time
import random
from typing import List, Dict

class AISimulationService:
    """AI对话模拟服务"""
    
    def __init__(self, response_delay: float = 0.5):
        self.response_delay = response_delay
        self.response_templates = [
            "您好！我是AI助手，很高兴为您服务。",
            "感谢您的提问，我会尽力为您解答。",
            "这个问题很有趣，让我思考一下...",
            "根据我的分析，您可能需要了解这方面的信息。",
            "我理解您的需求，以下是我的建议。",
            "这个问题比较复杂，让我详细解释一下。",
            "好的，我来帮您处理这个问题。",
            "非常感谢您的反馈！",
            "您说得对，我完全同意您的观点。",
            "让我为您提供更详细的信息。"
        ]
        
        self.context_responses = {
            "你好": ["您好！很高兴见到您。", "你好呀！有什么我可以帮助您的吗？"],
            "谢谢": ["不客气！这是我应该做的。", "很高兴能帮到您！"],
            "再见": ["再见！祝您有愉快的一天。", "期待下次与您交流！"],
            "天气": ["抱歉，我目前还不能查询实时天气。", "天气信息需要连接外部服务，我正在努力中。"],
            "时间": ["抱歉，我无法获取当前时间。", "您可以查看设备上的时钟获取准确时间。"]
        }
    
    def generate_response(self, message: str, context: List[Dict] = None) -> str:
        """
        生成AI模拟响应
        
        Args:
            message: 用户消息
            context: 对话上下文
            
        Returns:
            str: AI响应
        """
        # 模拟处理延迟
        time.sleep(self.response_delay)
        
        # 检查是否有匹配的上下文响应
        message_lower = message.lower()
        for key, responses in self.context_responses.items():
            if key in message_lower:
                return random.choice(responses)
        
        # 如果没有匹配的上下文，返回随机模板
        return random.choice(self.response_templates)
    
    def process_chat(self, message: str, context: List[Dict] = None, dialogue_id: str = None) -> Dict:
        """
        处理聊天请求
        
        Args:
            message: 用户消息
            context: 对话上下文
            dialogue_id: 对话ID
            
        Returns:
            Dict: 包含响应和对话ID的字典
        """
        response = self.generate_response(message, context)
        
        return {
            "reply": response,
            "dialogue_id": dialogue_id or self._generate_dialogue_id()
        }
    
    def _generate_dialogue_id(self) -> str:
        """生成对话ID"""
        return f"dialogue_{int(time.time() * 1000)}_{random.randint(0, 999)}"
