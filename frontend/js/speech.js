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
        // 将WebM格式转换为WAV格式（单声道、16位、16000Hz）
        // 
        // Args:
        //     webmBlob: WebM格式音频Blob
        //     
        // Returns:
        //     Blob: WAV格式音频Blob
        
        // 创建AudioContext
        this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });
        
        // 解码WebM音频
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        // 重新采样到16000Hz
        const resampledBuffer = this.resampleAudio(audioBuffer, 16000);
        
        // 转换为单声道
        const monoBuffer = this.toMono(resampledBuffer);
        
        // 转换为16位PCM格式
        const pcm16 = this.floatTo16BitPCM(monoBuffer.getChannelData(0));
        
        // 创建WAV文件头
        const wavHeader = this.createWavHeader(pcm16.length);
        
        // 合并WAV头和PCM数据
        const wavData = new Uint8Array(wavHeader.length + pcm16.length);
        wavData.set(wavHeader, 0);
        wavData.set(pcm16, wavHeader.length);
        
        return new Blob([wavData], { type: 'audio/wav' });
    }
    
    resampleAudio(audioBuffer, targetSampleRate) {
        // 重新采样音频
        // 
        // Args:
        //     audioBuffer: AudioBuffer对象
        //     targetSampleRate: 目标采样率
        //     
        // Returns:
        //     AudioBuffer: 重新采样后的AudioBuffer
        
        const sourceSampleRate = audioBuffer.sampleRate;
        const resampledContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: targetSampleRate
        });
        
        const resampledBuffer = resampledContext.createBuffer(
            audioBuffer.numberOfChannels,
            Math.ceil(audioBuffer.length * targetSampleRate / sourceSampleRate),
            targetSampleRate
        );
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const resampledData = resampledBuffer.getChannelData(channel);
            
            for (let i = 0; i < resampledData.length; i++) {
                const sourceIndex = i * sourceSampleRate / targetSampleRate;
                const index1 = Math.floor(sourceIndex);
                const index2 = Math.min(index1 + 1, sourceData.length - 1);
                const fraction = sourceIndex - index1;
                
                resampledData[i] = sourceData[index1] * (1 - fraction) + sourceData[index2] * fraction;
            }
        }
        
        return resampledBuffer;
    }
    
    toMono(audioBuffer) {
        // 转换为单声道
        // 
        // Args:
        //     audioBuffer: AudioBuffer对象
        //     
        // Returns:
        //     AudioBuffer: 单声道AudioBuffer
        
        if (audioBuffer.numberOfChannels === 1) {
            return audioBuffer;
        }
        
        const monoContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: audioBuffer.sampleRate
        });
        
        const monoBuffer = monoContext.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        
        const monoData = monoBuffer.getChannelData(0);
        
        for (let i = 0; i < audioBuffer.length; i++) {
            let sum = 0;
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                sum += audioBuffer.getChannelData(channel)[i];
            }
            monoData[i] = sum / audioBuffer.numberOfChannels;
        }
        
        return monoBuffer;
    }
    
    floatTo16BitPCM(float32Array) {
        // 将float32数组转换为16位PCM格式
        // 
        // Args:
        //     float32Array: float32格式音频数据
        //     
        // Returns:
        //     Uint8Array: 16位PCM格式音频数据
        
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(i * 2, int16, true);
        }
        
        return new Uint8Array(buffer);
    }
    
    createWavHeader(dataLength) {
        // 创建WAV文件头
        // 
        // Args:
        //     dataLength: PCM数据长度
        //     
        // Returns:
        //     Uint8Array: WAV文件头
        
        const sampleRate = 16000;
        const numChannels = 1;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const totalLength = 44 + dataLength;
        
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);
        
        // RIFF标识符
        view.setUint8(0, 0x52); // R
        view.setUint8(1, 0x49); // I
        view.setUint8(2, 0x46); // F
        view.setUint8(3, 0x46); // F
        
        // 文件长度
        view.setUint32(4, totalLength - 8, true);
        
        // WAVE标识符
        view.setUint8(8, 0x57); // W
        view.setUint8(9, 0x41); // A
        view.setUint8(10, 0x56); // V
        view.setUint8(11, 0x45); // E
        
        // fmt 子块
        view.setUint8(12, 0x66); // f
        view.setUint8(13, 0x6d); // m
        view.setUint8(14, 0x74); // t
        view.setUint8(15, 0x20); // 
        
        // fmt 子块长度
        view.setUint32(16, 16, true);
        
        // 音频格式 (PCM = 1)
        view.setUint16(20, 1, true);
        
        // 声道数
        view.setUint16(22, numChannels, true);
        
        // 采样率
        view.setUint32(24, sampleRate, true);
        
        // 字节率
        view.setUint32(28, byteRate, true);
        
        // 块对齐
        view.setUint16(32, blockAlign, true);
        
        // 采样位数
        view.setUint16(34, bytesPerSample * 8, true);
        
        // data 子块
        view.setUint8(36, 0x64); // d
        view.setUint8(37, 0x61); // a
        view.setUint8(38, 0x74); // t
        view.setUint8(39, 0x61); // a
        
        // data 子块长度
        view.setUint32(40, dataLength, true);
        
        return new Uint8Array(buffer);
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
        console.time('TTS总耗时');
        try {
            const url = `${this.options.apiBaseUrl}/tts`;
            
            // 优化的进度显示，更平滑的动画效果
            let progress = 0;
            const totalSteps = 100;
            const stepDuration = 200; // 每200ms更新一次进度
            const maxProgress = 95; // 最高显示95%，留5%给最终完成
            
            // 计算预计总时长，根据文本长度动态调整
            const estimatedTotalTime = Math.max(3000, text.length * 50); // 每个字符预计50ms
            const totalIntervals = estimatedTotalTime / stepDuration;
            const progressStep = maxProgress / totalIntervals;
            
            // 发送进度更新
            if (this.options.onProgress) {
                this.options.onProgress(0);
            }
            
            // 平滑的进度更新
            const progressInterval = setInterval(() => {
                progress += progressStep;
                if (progress >= maxProgress) {
                    progress = maxProgress;
                }
                // 发送进度更新
                if (this.options.onProgress) {
                    this.options.onProgress(Math.round(progress));
                }
            }, stepDuration);
            
            console.time('TTS网络请求');
            // 发送请求
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    speed: 1.0,
                    volume: this.volume,
                    pitch: 1.0
                })
            });
            console.timeEnd('TTS网络请求');
            
            // 清除进度定时器
            clearInterval(progressInterval);
            
            if (!response.ok) {
                throw new Error(`TTS请求失败: ${response.status}`);
            }
            
            // 更新进度为100%，表示合成完成
            if (this.options.onProgress) {
                this.options.onProgress(100);
            }
            
            console.time('TTS音频处理');
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
                        // 通知进度完成
                        if (this.options.onProgress) {
                            this.options.onProgress(101);
                        }
                    }, 1000);
                }
                
                console.timeEnd('TTS音频处理');
                console.timeEnd('TTS总耗时');
                return;
            }
            
            // 获取音频数据
            const audioBlob = await response.blob();
            console.log('TTS音频大小:', audioBlob.size, '字节');
            
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 播放音频
            this.audioElement.src = audioUrl;
            try {
                if (this.options.onAudioPlayed) {
                    this.options.onAudioPlayed();
                }
                await this.audioElement.play();
            } catch (error) {
                console.error('自动播放失败，等待用户交互后播放:', error);
                // 降级处理：不抛出错误，允许手动播放
                if (this.options.onAudioEnded) {
                    this.options.onAudioEnded();
                    // 通知进度完成
                    if (this.options.onProgress) {
                        this.options.onProgress(101);
                    }
                }
                console.timeEnd('TTS音频处理');
                console.timeEnd('TTS总耗时');
                return;
            }
            
            console.timeEnd('TTS音频处理');
            
            // 播放完成后释放资源
            this.audioElement.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                if (this.options.onAudioEnded) {
                    this.options.onAudioEnded();
                    // 通知进度完成
                    if (this.options.onProgress) {
                        this.options.onProgress(101);
                    }
                }
                console.timeEnd('TTS总耗时');
            }, { once: true });
            
        } catch (error) {
            console.error('文字转语音失败:', error);
            // 清除进度定时器
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            // 通知进度失败
            if (this.options.onProgress) {
                this.options.onProgress(-1);
            }
            
            // 降级处理：只显示文字，不播放语音
            if (this.options.onAudioPlayed) {
                this.options.onAudioPlayed();
            }
            
            if (this.options.onAudioEnded) {
                // 短暂延迟后调用结束回调，模拟音频播放
                setTimeout(() => {
                    this.options.onAudioEnded();
                }, 1000);
            }
            console.timeEnd('TTS总耗时');
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
