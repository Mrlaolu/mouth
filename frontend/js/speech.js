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
        // 省略了详细注释以节省篇幅，逻辑与之前相同
        this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });
        
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        const resampledBuffer = this.resampleAudio(audioBuffer, 16000);
        const monoBuffer = this.toMono(resampledBuffer);
        const pcm16 = this.floatTo16BitPCM(monoBuffer.getChannelData(0));
        const wavHeader = this.createWavHeader(pcm16.length);
        
        const wavData = new Uint8Array(wavHeader.length + pcm16.length);
        wavData.set(wavHeader, 0);
        wavData.set(pcm16, wavHeader.length);
        
        return new Blob([wavData], { type: 'audio/wav' });
    }
    
    resampleAudio(audioBuffer, targetSampleRate) {
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
        if (audioBuffer.numberOfChannels === 1) {
            return audioBuffer;
        }
        const monoContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: audioBuffer.sampleRate
        });
        const monoBuffer = monoContext.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
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
        const sampleRate = 16000;
        const numChannels = 1;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const totalLength = 44 + dataLength;
        
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);
        
        view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46); // RIFF
        view.setUint32(4, totalLength - 8, true);
        view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45); // WAVE
        view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20); // fmt 
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61); // data
        view.setUint32(40, dataLength, true);
        
        return new Uint8Array(buffer);
    }

    async sendToASR(audioBlob) {
        const url = `${this.options.apiBaseUrl}/asr`;
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
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

    // --- 修改点：增加 pitch 参数 ---
    async textToSpeech(text, pitch = 1.0) {
        // 将文字转换为语音
        // Args:
        //     text: 要转换的文字
        //     pitch: 音调 (0.5 - 2.0)，默认 1.0
        console.time('TTS总耗时');
        try {
            const url = `${this.options.apiBaseUrl}/tts`;
            
            // 进度条逻辑
            let progress = 0;
            const stepDuration = 200; 
            const maxProgress = 95; 
            const estimatedTotalTime = Math.max(3000, text.length * 50); 
            const totalIntervals = estimatedTotalTime / stepDuration;
            const progressStep = maxProgress / totalIntervals;
            
            if (this.options.onProgress) {
                this.options.onProgress(0);
            }
            
            const progressInterval = setInterval(() => {
                progress += progressStep;
                if (progress >= maxProgress) progress = maxProgress;
                if (this.options.onProgress) this.options.onProgress(Math.round(progress));
            }, stepDuration);
            
            console.time('TTS网络请求');
            
            // --- 修改点：发送 pitch 参数 ---
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    speed: 1.0,
                    volume: this.volume,
                    pitch: pitch // 使用传入的音调
                })
            });
            console.timeEnd('TTS网络请求');
            
            clearInterval(progressInterval);
            
            if (!response.ok) {
                throw new Error(`TTS请求失败: ${response.status}`);
            }
            
            if (this.options.onProgress) {
                this.options.onProgress(100);
            }
            
            console.time('TTS音频处理');
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                // 如果返回JSON（可能是空音频或其他情况），不做播放
                console.log('TTS返回JSON数据，跳过音频播放');
                if (this.options.onAudioPlayed) this.options.onAudioPlayed();
                if (this.options.onAudioEnded) {
                    setTimeout(() => {
                        this.options.onAudioEnded();
                        if (this.options.onProgress) this.options.onProgress(101);
                    }, 1000);
                }
                return;
            }
            
            const audioBlob = await response.blob();
            console.log('TTS音频大小:', audioBlob.size, '字节');
            const audioUrl = URL.createObjectURL(audioBlob);
            
            this.audioElement.src = audioUrl;
            try {
                if (this.options.onAudioPlayed) this.options.onAudioPlayed();
                await this.audioElement.play();
            } catch (error) {
                console.error('自动播放失败:', error);
                if (this.options.onAudioEnded) {
                    this.options.onAudioEnded();
                    if (this.options.onProgress) this.options.onProgress(101);
                }
                return;
            }
            
            console.timeEnd('TTS音频处理');
            
            this.audioElement.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                if (this.options.onAudioEnded) {
                    this.options.onAudioEnded();
                    if (this.options.onProgress) this.options.onProgress(101);
                }
                console.timeEnd('TTS总耗时');
            }, { once: true });
            
        } catch (error) {
            console.error('文字转语音失败:', error);
            // 错误处理逻辑
            if (typeof progressInterval !== 'undefined') clearInterval(progressInterval);
            if (this.options.onProgress) this.options.onProgress(-1);
            if (this.options.onAudioPlayed) this.options.onAudioPlayed();
            if (this.options.onAudioEnded) {
                setTimeout(() => {
                    this.options.onAudioEnded();
                }, 1000);
            }
            console.timeEnd('TTS总耗时');
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
    }

    updateRecordingUI(isRecording) {
        if (isRecording) {
            this.voiceBtn.classList.add('recording');
            this.voiceBtn.innerHTML = '<span class="btn-icon">⏹️</span><span class="btn-text">停止</span>';
            this.recordingIndicator.classList.add('active');
        } else {
            this.voiceBtn.classList.remove('recording');
            this.voiceBtn.innerHTML = '<span class="btn-icon">🎤</span><span class="btn-text">语音</span>';
            this.recordingIndicator.classList.remove('active');
        }
    }

    async testMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('麦克风测试失败:', error);
            return false;
        }
    }

    destroy() {
        if (this.isRecording) this.stopRecording();
        if (this.audioElement) {
            this.audioElement.remove();
            this.audioElement = null;
        }
    }
}