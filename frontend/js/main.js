// 主应用入口
class AIChatApp {
    constructor() {
        this.isInitialized = false;
        this.chatManager = null;
        this.speechManager = null;
        this.videoManager = null;
        this.config = {
            apiBaseUrl: 'http://localhost:5000/api',
            defaultVolume: 0.8,
            maxMessageLength: 500
        };
    }

    async init() {
        // 初始化应用
        try {
            console.log('初始化AI对话应用...');
            
            // 初始化各管理器
            this.videoManager = new VideoManager();
            this.chatManager = new ChatManager(this.config);
            this.speechManager = new SpeechManager({
                apiBaseUrl: this.config.apiBaseUrl,
                onSpeechRecognized: this.handleSpeechRecognized.bind(this),
                onAudioPlayed: this.handleAudioPlayed.bind(this),
                onAudioEnded: this.handleAudioEnded.bind(this),
                onProgress: (progress) => {
                    this.chatManager.updateTTSProgress(progress);
                }
            });
            
            // 绑定事件
            this.bindEvents();
            
            // 初始化UI状态
            this.initUI();
            
            this.isInitialized = true;
            console.log('应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    }

    bindEvents() {
        // 绑定事件监听器
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceBtn = document.getElementById('voice-btn');
        const volumeSlider = document.getElementById('volume-slider');
        
        // --- 新增：绑定性别切换按钮事件 ---
        const genderBtn = document.getElementById('gender-switch-btn');
        if (genderBtn) {
            genderBtn.addEventListener('click', () => {
                if (this.videoManager) {
                    this.videoManager.toggleGender();
                }
            });
        }
        
        // --- 新增：绑定TTS开关事件 ---
        const ttsSwitch = document.getElementById('tts-switch');
        if (ttsSwitch) {
            ttsSwitch.addEventListener('change', (e) => {
                this.handleTTSSwitchChange(e.target.checked);
            });
        }
        
        // 发送按钮点击事件
        sendBtn.addEventListener('click', () => this.handleSendMessage());
        
        // 回车键发送消息
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // 自动调整输入框高度
        messageInput.addEventListener('input', () => this.autoResizeTextarea(messageInput));
        
        // 语音按钮点击事件
        voiceBtn.addEventListener('click', () => this.handleVoiceToggle());
        
        // 音量调节事件
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.speechManager.setVolume(volume);
            this.videoManager.setVolume(volume); // 同步设置视频音量
            this.updateVolumeDisplay(e.target.value);
        });
    }

    initUI() {
        // 初始化UI状态
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        volumeSlider.value = this.config.defaultVolume * 100;
        volumeValue.textContent = `${Math.round(this.config.defaultVolume * 100)}%`;
        
        // 初始化TTS开关状态
        this.initTTSSwitch();
        
        // 初始化视频状态
        this.videoManager.switchToIdle();
        
        // 清空输入框
        this.clearInput();
    }
    
    initTTSSwitch() {
        // 初始化TTS开关
        const ttsSwitch = document.getElementById('tts-switch');
        const ttsStatus = document.getElementById('tts-status');
        
        if (!ttsSwitch || !ttsStatus) return;
        
        // 检查浏览器是否支持原生TTS
        const isSupported = this.speechManager.isBrowserTTSSupported;
        
        if (!isSupported) {
            // 浏览器不支持原生TTS，禁用开关并显示提示
            ttsSwitch.disabled = true;
            ttsStatus.textContent = '浏览器不支持';
            ttsStatus.style.color = '#ff6b6b';
            return;
        }
        
        // 从本地存储加载TTS设置
        const savedState = this.loadTTSSettings();
        ttsSwitch.checked = savedState.enabled;
        
        // 设置SpeechManager的TTS状态
        this.speechManager.setBrowserTTSEnabled(savedState.enabled);
        
        // 更新UI状态
        this.updateTTSSwitchUI(savedState.enabled);
    }
    
    handleTTSSwitchChange(checked) {
        // 处理TTS开关变化
        const success = this.speechManager.setBrowserTTSEnabled(checked);
        
        if (success) {
            // 保存设置到本地存储
            this.saveTTSSettings(checked);
            // 更新UI状态
            this.updateTTSSwitchUI(checked);
        } else {
            // 浏览器不支持，恢复开关状态
            const ttsSwitch = document.getElementById('tts-switch');
            if (ttsSwitch) {
                ttsSwitch.checked = false;
            }
            this.updateTTSSwitchUI(false);
            this.showError('您的浏览器不支持原生文本转语音功能');
        }
    }
    
    updateTTSSwitchUI(enabled) {
        // 更新TTS开关UI状态
        const ttsStatus = document.getElementById('tts-status');
        if (ttsStatus) {
            ttsStatus.textContent = enabled ? '开启' : '关闭';
            ttsStatus.style.color = enabled ? '#4CAF50' : '#888';
        }
    }
    
    loadTTSSettings() {
        // 从本地存储加载TTS设置
        try {
            const saved = localStorage.getItem('ttsSettings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载TTS设置失败:', error);
        }
        // 默认设置
        return { enabled: false };
    }
    
    saveTTSSettings(enabled) {
        // 保存TTS设置到本地存储
        try {
            const settings = { enabled };
            localStorage.setItem('ttsSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('保存TTS设置失败:', error);
        }
    }

    handleSendMessage() {
        // 处理发送消息
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;
        if (message.length > this.config.maxMessageLength) {
            this.showError(`消息长度不能超过${this.config.maxMessageLength}个字符`);
            return;
        }
        
        // 发送消息
        this.chatManager.sendMessage(message)
            .then(async (aiResponse) => {
                // 转换为语音
                // --- 修改点：获取当前角色音调并传入 ---
                const currentPitch = this.videoManager.getCurrentPitch();
                await this.speechManager.textToSpeech(aiResponse, currentPitch);
            })
            .catch(error => {
                console.error('发送消息失败:', error);
                this.showError('发送消息失败，请重试');
            });
        
        // 清空输入框
        this.clearInput();
    }

    handleVoiceToggle() {
        // 处理语音输入切换
        if (this.speechManager.isRecording) {
            this.speechManager.stopRecording();
        } else {
            this.speechManager.startRecording();
        }
    }

    handleSpeechRecognized(text) {
        // 处理语音识别结果
        if (text.trim()) {
            // 显示用户语音输入
            this.chatManager.displayMessage(text, 'user');
            
            // 发送到AI处理
            this.chatManager.sendMessage(text)
                .then(async (aiResponse) => {
                    // 转换为语音
                    // --- 修改点：获取当前角色音调并传入 ---
                    const currentPitch = this.videoManager.getCurrentPitch();
                    await this.speechManager.textToSpeech(aiResponse, currentPitch);
                })
                .catch(error => {
                    console.error('AI处理失败:', error);
                    this.showError('AI处理失败，请重试');
                });
        }
    }

    handleAudioPlayed() {
        // 处理音频开始播放 -> 切换到说话视频
        this.videoManager.switchToSpeaking();
    }

    handleAudioEnded() {
        // 处理音频播放结束 -> 切换回待机视频
        this.videoManager.switchToIdle();
    }

    autoResizeTextarea(textarea) {
        // 自动调整文本框高度
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    clearInput() {
        // 清空输入框
        const messageInput = document.getElementById('message-input');
        messageInput.value = '';
        this.autoResizeTextarea(messageInput);
    }

    updateVolumeDisplay(value) {
        // 更新音量显示
        const volumeValue = document.getElementById('volume-value');
        volumeValue.textContent = `${value}%`;
    }

    showError(message) {
        // 显示错误信息
        alert(message);
    }

    showLoading(show = true) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// 应用实例
let app;

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new AIChatApp();
    app.init();
});