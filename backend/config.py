import os

class Config:
    """应用配置类"""
    
    # 基本配置
    DEBUG = True
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # API配置
    API_PREFIX = '/api'
    
    # AI模拟配置
    AI_RESPONSE_DELAY = 0.5  # AI响应延迟（秒）
    
    # 语音处理配置
    ASR_MODEL_PATH = os.environ.get('ASR_MODEL_PATH') or 'model'
    TTS_SPEAKER = 'zhiyuan'
    TTS_SPEED = 1.0
    TTS_VOLUME = 1.0
    TTS_PITCH = 1.0
    
    # 音频格式配置
    AUDIO_FORMAT = 'wav'
    SAMPLE_RATE = 16000
    CHANNELS = 1
    
    # CORS配置
    CORS_ORIGINS = ['*']

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False

# 根据环境变量选择配置
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
