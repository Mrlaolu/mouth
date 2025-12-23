// 视频控制模块
class VideoManager {
    constructor() {
        this.currentState = 'idle'; // idle 或 speaking
        this.videoElement = null;
        this.videoStatusElement = null;
        
        // 视频资源路径
        this.videoPaths = {
            idle: '../video/idle.mp4',
            speaking: '../video/speak.mp4'
        };
        
        // 初始化视频元素
        this.initVideoElement();
    }

    initVideoElement() {
        // 初始化视频元素
        this.videoElement = document.getElementById('digital-human');
        this.videoStatusElement = document.getElementById('video-status');
        
        if (!this.videoElement) {
            console.error('视频元素未找到');
            return;
        }
        
        // 预加载视频资源
        this.preloadVideos();
        
        // 绑定视频事件
        this.videoElement.addEventListener('loadeddata', () => {
            console.log('视频加载完成:', this.videoElement.src);
        });
        
        this.videoElement.addEventListener('error', (e) => {
            console.error('视频加载错误:', e);
            this.showError('视频加载失败');
        });
        
        this.videoElement.addEventListener('ended', () => {
            // 循环播放当前视频
            this.videoElement.play();
        });
    }

    preloadVideos() {
        // 预加载视频资源
        // 创建预加载视频元素
        const idleVideo = document.createElement('video');
        idleVideo.preload = 'auto';
        idleVideo.src = this.videoPaths.idle;
        
        const speakVideo = document.createElement('video');
        speakVideo.preload = 'auto';
        speakVideo.src = this.videoPaths.speak;
        
        // 预加载完成后移除元素
        idleVideo.addEventListener('loadeddata', () => {
            console.log('闲置视频预加载完成');
            idleVideo.remove();
        });
        
        speakVideo.addEventListener('loadeddata', () => {
            console.log('说话视频预加载完成');
            speakVideo.remove();
        });
    }

    switchToIdle() {
        // 切换到闲置状态视频
        if (this.currentState === 'idle') {
            return; // 已经是闲置状态，无需切换
        }
        
        this._switchVideo('idle');
    }

    switchToSpeaking() {
        // 切换到说话状态视频
        if (this.currentState === 'speaking') {
            return; // 已经是说话状态，无需切换
        }
        
        this._switchVideo('speaking');
    }

    _switchVideo(state) {
        // 切换视频状态
        // 
        // Args:
        //     state: 目标状态 ('idle' 或 'speaking')
        try {
            const videoPath = this.videoPaths[state];
            
            if (!videoPath) {
                console.error('无效的视频状态:', state);
                return;
            }
            
            // 平滑切换视频
            this.videoElement.style.opacity = '0';
            
            // 使用setTimeout确保opacity过渡效果
            setTimeout(() => {
                // 移除之前的事件监听器
                this.videoElement.removeEventListener('loadeddata', this._onVideoLoaded);
                
                // 添加loadeddata事件监听器，确保视频加载完成后再播放
                this._onVideoLoaded = () => {
                    try {
                        this.videoElement.play();
                        this.videoElement.style.opacity = '1';
                        
                        // 更新状态
                        this.currentState = state;
                        this.updateStatus(state);
                    } catch (playError) {
                        console.warn('视频播放失败:', playError);
                        // 播放失败时仍需更新状态
                        this.videoElement.style.opacity = '1';
                        this.currentState = state;
                        this.updateStatus(state);
                    }
                };
                
                this.videoElement.addEventListener('loadeddata', this._onVideoLoaded);
                this.videoElement.src = videoPath;
            }, 200);
            
        } catch (error) {
            console.error('视频切换失败:', error);
            this.showError('视频切换失败');
        }
    }

    updateStatus(state) {
        // 更新视频状态显示
        // 
        // Args:
        //     state: 当前状态 ('idle' 或 'speaking')
        if (!this.videoStatusElement) return;
        
        const statusText = {
            idle: '闲置中',
            speaking: '正在说话'
        };
        
        this.videoStatusElement.textContent = statusText[state] || '未知状态';
    }

    showError(message) {
        // 显示错误信息
        // 
        // Args:
        //     message: 错误信息
        console.error('视频错误:', message);
        
        if (this.videoStatusElement) {
            this.videoStatusElement.textContent = `错误: ${message}`;
            this.videoStatusElement.style.color = '#dc3545';
        }
        
        // 3秒后恢复正常状态显示
        setTimeout(() => {
            this.updateStatus(this.currentState);
            if (this.videoStatusElement) {
                this.videoStatusElement.style.color = '';
            }
        }, 3000);
    }

    getCurrentState() {
        // 获取当前视频状态
        // 
        // Returns:
        //     str: 当前状态 ('idle' 或 'speaking')
        return this.currentState;
    }

    setVolume(volume) {
        // 设置视频音量
        // 
        // Args:
        //     volume: 音量值 (0.0-1.0)
        if (this.videoElement) {
            this.videoElement.volume = volume;
        }
    }

    play() {
        // 播放视频
        if (this.videoElement && this.videoElement.paused) {
            this.videoElement.play();
        }
    }

    pause() {
        // 暂停视频
        if (this.videoElement && !this.videoElement.paused) {
            this.videoElement.pause();
        }
    }

    togglePlay() {
        // 切换播放/暂停状态
        if (this.videoElement) {
            if (this.videoElement.paused) {
                this.videoElement.play();
            } else {
                this.videoElement.pause();
            }
        }
    }
}
