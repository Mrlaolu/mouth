// 视频控制模块
class VideoManager {
    constructor() {
        // 状态管理
        this.currentState = 'idle';   // 'idle' 或 'speaking'
        this.currentGender = 'female'; // 'female' 或 'male'
        
        // 双视频标签管理
        this.videoElements = {
            primary: null,   // 当前显示的视频
            secondary: null  // 预加载的视频
        };
        this.videoStatusElement = null;
        this.isSwitching = false; // 防止切换过程中重复触发
        
        // --- 核心配置：在这里定义男女角色的视频列表 ---
        // 注意：请确保 ../video/ 目录下存在对应的文件
        // 如果文件不存在，请修改为你实际拥有的文件名
        this.avatarConfig = {
            female: {
                label: '女性角色',
                icon: '👩',
                pitch: 1.0, // 女声标准音调
                // 女性待机视频列表 (随机播放)
                idle: ['../video/idle.mp4', '../video/idle2.mp4'], 
                // 女性说话视频列表 (随机播放)
                speaking: ['../video/speak.mp4', '../video/speak2.mp4']
            },
            male: {
                label: '男性角色',
                icon: '👨',
                pitch: 0.8, // 男声较低音调
                // 男性待机视频列表 (示例文件名，请确保你放入了对应文件)
                idle: ['../video/male_idle.mp4', '../video/male_idle2.mp4'],
                // 男性说话视频列表
                speaking: ['../video/male_speak.mp4', '../video/male_speak2.mp4']
            }
        };

        // 初始化视频元素
        this.initVideoElement();
    }

    initVideoElement() {
        // 获取DOM元素
        this.videoElements.primary = document.getElementById('digital-human');
        this.videoElements.secondary = document.getElementById('digital-human-backup');
        this.videoStatusElement = document.getElementById('video-status');
        
        if (!this.videoElements.primary || !this.videoElements.secondary) {
            console.error('视频元素未找到');
            return;
        }

        // 1. 移除HTML中的 loop 属性（如果存在），由JS接管循环逻辑
        this.videoElements.primary.loop = false;
        this.videoElements.secondary.loop = false;

        // 视频加载完成事件
        this.videoElements.primary.addEventListener('loadeddata', () => {
            // 视频加载完成，确保它已经可见
            if (this.videoElements.primary.style.opacity === '1') {
                // 确保视频播放
                this.videoElements.primary.play().catch(error => {
                    console.log("等待用户交互以开始播放视频:", error);
                });
            }
        });
        
        this.videoElements.secondary.addEventListener('loadeddata', () => {
            // 备用视频加载完成，如果当前正在切换到它，则显示它
            if (this.videoElements.secondary.style.opacity === '1') {
                // 确保视频播放
                this.videoElements.secondary.play().catch(error => {
                    console.log("等待用户交互以开始播放视频:", error);
                });
            }
        });
        
        // 视频播放结束事件处理 - 只保留这一个事件监听器
        this.videoElements.primary.addEventListener('ended', () => {
            // 防止快速连续触发
            setTimeout(() => {
                this.playNextRandomVideo();
            }, 100); // 延迟100ms，防止快速连续触发
        });
        
        this.videoElements.secondary.addEventListener('ended', () => {
            // 防止快速连续触发
            setTimeout(() => {
                this.playNextRandomVideo();
            }, 100); // 延迟100ms
        });

        this.videoElements.primary.addEventListener('error', (e) => {
            console.error('主视频播放错误:', e);
            this.showError('视频加载失败');
        });
        
        this.videoElements.secondary.addEventListener('error', (e) => {
            console.error('备用视频播放错误:', e);
            // 备用视频错误不显示，因为用户看不到
        });

        // 3. 初始加载并播放
        // 稍微延迟一点确保DOM完全就绪
        setTimeout(() => {
            this.playNextRandomVideo();
        }, 100);
    }

    // --- 核心逻辑：播放下一个随机视频 ---
    playNextRandomVideo() {
        if (this.isSwitching) return; // 防止切换过程中重复触发
        
        const config = this.avatarConfig[this.currentGender];
        // 根据当前状态(idle/speaking)获取对应的视频列表
        const videoList = config[this.currentState];
        
        if (!videoList || videoList.length === 0) {
            console.warn(`未找到 ${this.currentGender} - ${this.currentState} 的视频列表`);
            return;
        }

        // 随机选择一个索引
        const randomIndex = Math.floor(Math.random() * videoList.length);
        const nextVideoPath = videoList[randomIndex];

        // 双视频切换逻辑
        this.switchVideos(nextVideoPath);
    }
    
    switchVideos(videoPath) {
        this.isSwitching = true;
        
        // 确定当前显示的视频和要切换到的视频
        const currentVideo = this.videoElements.primary.style.opacity === '1' ? 'primary' : 'secondary';
        const nextVideo = currentVideo === 'primary' ? 'secondary' : 'primary';
        
        // 准备下一个视频
        const nextVideoElement = this.videoElements[nextVideo];
        const currentVideoElement = this.videoElements[currentVideo];
        
        // 设置下一个视频的源
        nextVideoElement.src = videoPath;
        
        // 监听下一个视频的loadeddata事件，确保完全加载后再切换
        const onNextVideoLoaded = () => {
            // 移除事件监听器，避免重复触发
            nextVideoElement.removeEventListener('loadeddata', onNextVideoLoaded);
            
            // 开始播放下一个视频（静音状态下，浏览器允许自动播放）
            nextVideoElement.play().catch(error => {
                console.log("等待用户交互以开始播放视频:", error);
            });
            
            // 平滑切换视频：将当前视频淡出，下一个视频淡入
            currentVideoElement.style.opacity = '0';
            nextVideoElement.style.opacity = '1';
            
            // 延迟恢复可切换状态，确保过渡效果完成
            setTimeout(() => {
                this.isSwitching = false;
            }, 300); // 与CSS过渡时间匹配
        };
        
        // 绑定事件监听器
        nextVideoElement.addEventListener('loadeddata', onNextVideoLoaded);
        
        // 确保视频加载（预加载）
        nextVideoElement.load();
    }

    // 切换到闲置状态
    switchToIdle() {
        if (this.currentState === 'idle') return;
        
        this.currentState = 'idle';
        this.updateStatus('idle');
        // 立即切换视频，不要等待当前视频播完，以获得更快的响应
        this.playNextRandomVideo(); 
    }

    // 切换到说话状态
    switchToSpeaking() {
        if (this.currentState === 'speaking') return;
        
        this.currentState = 'speaking';
        this.updateStatus('speaking');
        // 立即切换视频
        this.playNextRandomVideo();
    }

    // --- 新增功能：切换性别 ---
    toggleGender() {
        // 1. 切换状态变量
        this.currentGender = this.currentGender === 'female' ? 'male' : 'female';
        const config = this.avatarConfig[this.currentGender];

        // 2. 更新UI按钮显示 (图标和文字)
        const iconEl = document.getElementById('gender-icon');
        const textEl = document.getElementById('gender-text');
        
        if (iconEl) iconEl.textContent = config.icon;
        if (textEl) textEl.textContent = config.label;

        console.log(`切换性别为: ${this.currentGender}, 音调: ${config.pitch}`);
        
        // 3. 立即刷新视频内容
        this.playNextRandomVideo();
    }

    // --- 新增功能：获取当前角色的音调 (供TTS使用) ---
    getCurrentPitch() {
        return this.avatarConfig[this.currentGender].pitch;
    }

    updateStatus(state) {
        // 更新视频状态文字显示
        if (!this.videoStatusElement) return;
        
        const statusText = {
            idle: '闲置中',
            speaking: '正在说话'
        };
        
        this.videoStatusElement.textContent = statusText[state] || '未知状态';
    }

    showError(message) {
        // 显示错误信息
        console.error('VideoManager Error:', message);
        
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
    
    // 辅助方法：设置音量
    setVolume(volume) {
        // 同时设置两个视频元素的音量
        if (this.videoElements.primary) {
            this.videoElements.primary.volume = volume;
        }
        if (this.videoElements.secondary) {
            this.videoElements.secondary.volume = volume;
        }
    }
}