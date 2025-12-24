// 视频控制模块
class VideoManager {
    constructor() {
        // 状态管理
        this.currentState = 'idle';   // 'idle' 或 'speaking'
        this.currentGender = 'female'; // 'female' 或 'male'
        
        this.videoElement = null;
        this.videoStatusElement = null;
        
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
        this.videoElement = document.getElementById('digital-human');
        this.videoStatusElement = document.getElementById('video-status');
        
        if (!this.videoElement) {
            console.error('视频元素未找到');
            return;
        }

        // 1. 移除HTML中的 loop 属性（如果存在），由JS接管循环逻辑
        // 这样每次播放完都能触发 ended 事件，从而随机选下一个
        this.videoElement.loop = false;

        // 2. 绑定关键事件：当前视频播放结束时，自动随机播放下一个
        // 这实现了“无限随机续播”功能
        this.videoElement.addEventListener('ended', () => {
            this.playNextRandomVideo();
        });
        
        this.videoElement.addEventListener('loadeddata', () => {
            // 视频加载完成，可以做些处理，比如调整透明度显示出来
            this.videoElement.style.opacity = '1';
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error('视频播放错误:', e);
            this.showError('视频加载失败');
        });

        // 3. 初始加载并播放
        // 稍微延迟一点确保DOM完全就绪
        setTimeout(() => {
            this.playNextRandomVideo();
        }, 100);
    }

    // --- 核心逻辑：播放下一个随机视频 ---
    playNextRandomVideo() {
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

        // 切换视频源
        // 注意：单video标签切换src时可能会有短暂黑屏/闪烁
        // 为了平滑过渡，通常需要双video标签交替，这里保持简单使用单标签
        this.videoElement.src = nextVideoPath;
        
        // 尝试播放
        const playPromise = this.videoElement.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // 浏览器通常会阻止自动播放，直到用户与页面交互
                console.log("等待用户交互以开始播放视频:", error);
            });
        }
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
        if (this.videoElement) {
            this.videoElement.volume = volume;
        }
    }
}