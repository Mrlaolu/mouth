// 语音处理模块
class SpeechManager {
    constructor(options) {
        this.options = options;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.audioElement = null;
        this.volume = 0.8;
        
        // DOM元素
        this.voiceBtn = document.getElementById('voice-btn');
        this.recordingIndicator = document.getElementById('recording-indicator');
        
        // 初始化音频元素
        this.initAudioElement();
    }

    initAudioElement() {
        // 初始化音频播放元素
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        this.audioElement.volume = this.volume;
        document.body.appendChild(this.audioElement);
        
        // 绑定音频事件
        this.audioElement.addEventListener('play', () => {
            if (this.options.onAudioPlayed) {
                this.options.onAudioPlayed();
            }
        });
        
        this.audioElement.addEventListener('ended', () => {
            if (this.options.onAudioEnded) {
                this.options.onAudioEnded();
            }
        });
        
        this.audioElement.addEventListener('error', (e) => {
            console.error('音频播放错误:', e);
        });
    }

    async startRecording() {
        // 开始录音
        try {
            // 请求麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 创建MediaRecorder实例
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            // 重置音频块
            this.audioChunks = [];
            
            // 绑定录音事件
            this.mediaRecorder.addEventListener('dataavailable', (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            });
            
            this.mediaRecorder.addEventListener('stop', () => {
                // 停止所有音频轨道
                stream.getTracks().forEach(track => track.stop());
                
                // 处理录音数据
                this.processRecording();
            });
            
            // 开始录音
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // 更新UI状态
            this.updateRecordingUI(true);
            
        } catch (error) {
            console.error('录音失败:', error);
            alert('无法访问麦克风，请检查权限设置');
        }
    }

    stopRecording() {
        // 停止录音
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // 更新UI状态
            this.updateRecordingUI(false);
        }
    }

    async processRecording() {
        // 处理录音数据
        try {
            // 创建音频Blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
            
            // 转换为WAV格式（Vosk要求WAV格式）
            const wavBlob = await this.convertToWav(audioBlob);
            
            // 发送到ASR API
            const text = await this.sendToASR(wavBlob);
            
            // 调用回调函数
            if (this.options.onSpeechRecognized) {
                this.options.onSpeechRecognized(text);
            }
            
        } catch (error) {
            console.error('处理录音失败:', error);
            alert('语音识别失败，请重试');
        }
    }

    async convertToWav(webmBlob) {
        // 将WebM格式转换为WAV格式
        // 
        // Args:
        //     webmBlob: WebM格式音频Blob
        //     
        // Returns:
        //     Blob: WAV格式音频Blob
        // 简单实现：直接返回WAV格式
        // 注意：在实际应用中，可能需要使用Web Audio API进行格式转换
        // 这里为了简化，假设后端可以处理WebM格式
        return webmBlob;
    }

    async sendToASR(audioBlob) {
        // 发送音频到ASR API
        // 
        // Args:
        //     audioBlob: 音频Blob
        //     
        // Returns:
        //     str: 识别结果
        const url = `${this.options.apiBaseUrl}/asr`;
        
        // 创建FormData
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        // 发送请求
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`ASR请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        return result.text || '';
    }

    async textToSpeech(text) {
        // 将文字转换为语音
        // 
        // Args:
        //     text: 要转换的文字
        try {
            const url = `${this.options.apiBaseUrl}/tts`;
            
            // 发送请求
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    speed: 1.0,
                    volume: 1.0,
                    pitch: 1.0
                })
            });
            
            if (!response.ok) {
                throw new Error(`TTS请求失败: ${response.status}`);
            }
            
            // 检查响应类型
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                // 后端返回JSON数据，不播放音频
                console.log('TTS返回JSON数据，跳过音频播放');
                
                // 手动调用音频播放开始和结束回调，确保视频状态正确切换
                if (this.options.onAudioPlayed) {
                    this.options.onAudioPlayed();
                }
                
                if (this.options.onAudioEnded) {
                    // 短暂延迟后调用结束回调，模拟音频播放
                    setTimeout(() => {
                        this.options.onAudioEnded();
                    }, 1000);
                }
                
                return;
            }
            
            // 获取音频数据
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 播放音频
            this.audioElement.src = audioUrl;
            try {
                await this.audioElement.play();
            } catch (error) {
                console.error('自动播放失败，等待用户交互后播放:', error);
                // 降级处理：不抛出错误，允许手动播放
            }
            
            // 播放完成后释放资源
            this.audioElement.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            }, { once: true });
            
        } catch (error) {
            console.error('文字转语音失败:', error);
            // 降级处理：只显示文字，不播放语音
            
            // 手动调用音频播放开始和结束回调，确保视频状态正确切换
            if (this.options.onAudioPlayed) {
                this.options.onAudioPlayed();
            }
            
            if (this.options.onAudioEnded) {
                // 短暂延迟后调用结束回调，模拟音频播放
                setTimeout(() => {
                    this.options.onAudioEnded();
                }, 1000);
            }
        }
    }

    setVolume(volume) {
        // 设置音量
        // 
        // Args:
        //     volume: 音量值（0.0-1.0）
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
    }

    updateRecordingUI(isRecording) {
        // 更新录音状态UI
        // 
        // Args:
        //     isRecording: 是否正在录音
        if (isRecording) {
            // 显示录音状态
            this.voiceBtn.classList.add('recording');
            this.voiceBtn.innerHTML = '<span class="btn-icon">⏹️</span><span class="btn-text">停止</span>';
            this.recordingIndicator.classList.add('active');
        } else {
            // 隐藏录音状态
            this.voiceBtn.classList.remove('recording');
            this.voiceBtn.innerHTML = '<span class="btn-icon">🎤</span><span class="btn-text">语音</span>';
            this.recordingIndicator.classList.remove('active');
        }
    }

    async testMicrophone() {
        // 测试麦克风是否可用
        // 
        // Returns:
        //     bool: 麦克风是否可用
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 停止流
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('麦克风测试失败:', error);
            return false;
        }
    }

    destroy() {
        // 销毁资源
        // 停止录音
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // 移除音频元素
        if (this.audioElement) {
            this.audioElement.remove();
            this.audioElement = null;
        }
        
        // 清理事件监听器
        // 注意：移除了对不存在的toggleRecording方法的引用
    }
}
