// 对话管理模块
class ChatManager {
    constructor(config) {
        this.config = config;
        this.chatHistory = [];
        this.dialogueId = null;
        this.isProcessing = false;
        
        // DOM元素
        this.chatHistoryElement = document.getElementById('chat-history');
        this.statusInfoElement = document.getElementById('status-info');
    }

    displayMessage(message, sender, isLoading = false) {
        // 在聊天历史中显示消息
        // 
        // Args:
        //     message: 消息内容
        //     sender: 发送者 ('user' 或 'ai')
        //     isLoading: 是否为加载状态
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        let messageContent;
        if (isLoading) {
            messageContent = `
                <div class="message-bubble">
                    <div class="loading-indicator">
                        <span>正在思考</span>
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const timestamp = new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            messageContent = `
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(message)}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        }
        
        messageElement.innerHTML = messageContent;
        this.chatHistoryElement.appendChild(messageElement);
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 添加到对话历史
        if (!isLoading) {
            this.chatHistory.push({
                message: message,
                sender: sender,
                timestamp: Date.now()
            });
        }
        
        return messageElement;
    }
    
    displayMessageWithTypingEffect(message, sender, onComplete = null) {
        // 带打字机效果的消息显示
        // 
        // Args:
        //     message: 消息内容
        //     sender: 发送者 ('user' 或 'ai')
        //     onComplete: 完成回调函数
        
        // 创建消息元素，初始为空
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 初始HTML结构
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-text" id="typing-message-${Date.now()}"></div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        this.chatHistoryElement.appendChild(messageElement);
        this.scrollToBottom();
        
        // 获取消息文本元素
        const messageTextElement = messageElement.querySelector('.message-text');
        
        // 逐字显示消息
        let index = 0;
        const speed = 50; // 每50ms显示一个字符
        
        const typeNextCharacter = () => {
            if (index < message.length) {
                // 批量添加字符，提高性能
                const batchSize = 3;
                const nextIndex = Math.min(index + batchSize, message.length);
                const nextText = message.substring(0, nextIndex);
                
                // 使用requestAnimationFrame优化DOM更新
                requestAnimationFrame(() => {
                    messageTextElement.textContent = this.escapeHtml(nextText);
                    this.scrollToBottom();
                });
                
                index = nextIndex;
                setTimeout(typeNextCharacter, speed);
            } else {
                // 打字完成，添加到对话历史
                this.chatHistory.push({
                    message: message,
                    sender: sender,
                    timestamp: Date.now()
                });
                
                // 调用回调函数
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
            }
        };
        
        // 开始打字效果
        typeNextCharacter();
        
        return messageElement;
    }

    async sendMessage(message) {
        // 发送消息到AI服务
        // 
        // Args:
        //     message: 用户消息
        //     
        // Returns:
        //     str: AI响应
        console.time('AI消息处理总耗时');
        if (this.isProcessing) {
            console.warn('正在处理中，请稍后再试');
            return;
        }
        
        try {
            this.isProcessing = true;
            
            // 显示用户消息
            this.displayMessage(message, 'user');
            
            // 更新状态
            this.updateStatus('正在处理...');
            
            // 显示AI加载状态
            const loadingMessageElement = this.displayLoadingMessage();
            
            console.time('AI API调用耗时');
            // 发送请求到AI服务
            const response = await this.callAIChatAPI(message);
            console.timeEnd('AI API调用耗时');
            
            // 移除加载状态
            if (loadingMessageElement) {
                loadingMessageElement.remove();
            }
            
            // 更新状态
            this.updateStatus('AI正在回复...');
            
            // 保存对话ID
            if (response.dialogue_id) {
                this.dialogueId = response.dialogue_id;
            }
            
            console.time('AI打字机效果耗时');
            // 带打字机效果显示AI响应
            this.displayMessageWithTypingEffect(response.reply, 'ai', () => {
                this.updateStatus('就绪');
                console.timeEnd('AI打字机效果耗时');
                console.timeEnd('AI消息处理总耗时');
            });
            
            return response.reply;
            
        } catch (error) {
            console.error('发送消息失败:', error);
            this.updateStatus('发送失败，请重试');
            console.timeEnd('AI消息处理总耗时');
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async callAIChatAPI(message) {
        // 调用AI对话API
        // 
        // Args:
        //     message: 用户消息
        //     
        // Returns:
        //     dict: API响应
        const url = `${this.config.apiBaseUrl}/chat`;
        
        const requestData = {
            message: message,
            context: this.chatHistory.slice(-5), // 只发送最近5条消息作为上下文
            dialogue_id: this.dialogueId
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    }

    displayLoadingMessage() {
        // 显示AI加载状态
        // 
        // Returns:
        //     HTMLElement: 加载消息元素
        const messageElement = document.createElement('div');
        messageElement.className = 'message ai';
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="loading-indicator">
                    <span>正在思考</span>
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        this.chatHistoryElement.appendChild(messageElement);
        this.scrollToBottom();
        
        return messageElement;
    }

    updateStatus(status) {
        // 更新状态信息
        // 
        // Args:
        //     status: 状态文本
        if (this.statusInfoElement) {
            this.statusInfoElement.textContent = status;
        }
    }
    
    updateTTSProgress(progress) {
        // 更新语音合成进度
        // 
        // Args:
        //     progress: 合成进度 (0-100)
        if (progress >= 0 && progress <= 100) {
            this.updateStatus(`语音合成中: ${progress}%`);
        } else if (progress === 101) {
            // 合成完成
            this.updateStatus('语音合成完成');
            // 2秒后恢复正常状态
            setTimeout(() => {
                this.updateStatus('就绪');
            }, 2000);
        } else if (progress === -1) {
            // 合成失败
            this.updateStatus('语音合成失败');
            // 2秒后恢复正常状态
            setTimeout(() => {
                this.updateStatus('就绪');
            }, 2000);
        }
    }
    
    handleRealTimeUpdate(data) {
        // 处理实时更新事件
        // 
        // Args:
        //     data: 实时更新数据
        switch (data.type) {
            case 'tts_progress':
                // 更新TTS进度
                this.updateTTSProgress(data.progress);
                break;
            case 'ai_response_chunk':
                // 处理AI响应片段
                // 这里可以扩展，用于接收流式AI响应
                break;
            case 'status_update':
                // 更新系统状态
                this.updateStatus(data.message);
                break;
            default:
                console.warn('未知的实时更新类型:', data.type);
        }
    }

    scrollToBottom() {
        // 滚动聊天历史到底部
        this.chatHistoryElement.scrollTop = this.chatHistoryElement.scrollHeight;
    }

    escapeHtml(text) {
        // 转义HTML字符，防止XSS攻击
        // 
        // Args:
        //     text: 要转义的文本
        //     
        // Returns:
        //     str: 转义后的文本
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearChatHistory() {
        // 清空聊天历史
        this.chatHistory = [];
        this.dialogueId = null;
        this.chatHistoryElement.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用AI对话系统</h2>
                <p>您可以通过文字或语音与AI进行交流</p>
            </div>
        `;
        this.updateStatus('就绪');
    }

    getChatHistory() {
        // 获取聊天历史
        // 
        // Returns:
        //     array: 聊天历史记录
        return this.chatHistory;
    }

    setDialogueId(dialogueId) {
        // 设置对话ID
        // 
        // Args:
        //     dialogueId: 对话ID
        this.dialogueId = dialogueId;
    }
}
