# AI对话Web网站

注意使用conda 的 mouth环境 ，然后前端启动为在frontend里运行 python -m http.server 8000,后端启动为在backend里运行python app.py
注意我是用的终端是powershell

conda activate mouth
cd backend
python app.py


conda activate mouth
cd frontend
python -m http.server 8000

## 项目概述

这是一个功能完整的AI对话Web网站，集成了文字对话、语音对话和数字人视频播放功能。系统采用前后端分离架构，前端使用HTML/CSS/JavaScript实现，后端使用Python Flask开发API服务。

## 功能特性

### 核心功能
- **文字对话系统**：支持用户输入文本与AI进行实时交互，实现对话历史记录、上下文保持及消息发送/接收状态显示
- **语音对话功能**：允许用户通过麦克风进行语音输入和接收语音输出，包含录音控制、语音状态指示及音量调节功能
- **数字人视频播放**：左侧区域集成数字人视频播放，自动切换闲置/说话状态视频
- **视频播放逻辑**：AI语音回复时自动播放speak.mp4，闲置状态播放idle.mp4，实现平滑过渡

### 技术实现
- **PaddleSpeech**：实现文本转语音(TTS)功能，支持中文语音合成
- **Vosk**：实现语音转文字(ASR)功能，支持实时语音流处理
- **Flask**：后端API服务框架
- **HTML/CSS/JavaScript**：前端界面和交互逻辑

## 技术栈

### 后端
- Python 3.8+
- Flask 2.0+
- Flask-CORS
- PaddleSpeech
- Vosk
- numpy

### 前端
- HTML5
- CSS3
- JavaScript (ES6+)

## 项目结构

```
├── backend/                # 后端服务
│   ├── app.py              # Flask应用主入口
│   ├── config.py           # 配置文件
│   ├── api/                # API蓝图
│   ├── services/           # 业务服务
│   └── requirements.txt    # 依赖列表
├── frontend/               # 前端应用
│   ├── index.html          # 主页面
│   ├── css/                # 样式文件
│   └── js/                 # JavaScript逻辑
├── video/                  # 视频资源
│   ├── idle.mp4            # 闲置状态视频
│   └── speak.mp4           # 说话状态视频
└── README.md               # 项目文档
```

## 部署说明

### 环境要求
- Conda环境：mouth
- Python 3.8+
- Node.js (可选，用于前端开发)

### 环境配置

1. **激活conda环境**
   ```bash
   conda activate mouth
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **启动后端服务**
   ```bash
   python app.py
   ```
   服务将运行在 http://127.0.0.1:5002

4. **启动前端服务**
   ```bash
   cd frontend
   python -m http.server 8080
   ```
   前端将运行在 http://127.0.0.1:8080

### API端点

- **GET /health** - 健康检查
- **POST /api/chat** - AI对话接口
  - 请求：`{"message": "用户消息", "context": [...], "dialogue_id": "xxx"}`
  - 响应：`{"reply": "AI回复", "dialogue_id": "xxx"}`

## 使用说明

1. 在浏览器中访问 http://127.0.0.1:8080
2. 通过文字输入框或语音按钮与AI进行交流
3. 观察左侧数字人视频的状态变化
4. 使用音量滑块调节语音音量

## 交互流程

### 文字对话
1. 用户输入文字 → 点击发送按钮
2. 前端发送请求到 `/api/chat`
3. 后端处理请求 → 返回AI响应
4. 前端显示AI回复 → 转换为语音（如果启用）
5. 播放语音 → 数字人视频切换到说话状态
6. 语音播放结束 → 数字人视频切换到闲置状态

### 语音对话
1. 用户点击语音按钮 → 开始录音
2. 用户说话 → 前端录制音频
3. 前端停止录音 → 发送音频到ASR API
4. ASR转文字 → 发送文字到AI对话API
5. AI生成回复 → 发送文字到TTS API
6. TTS合成语音 → 前端播放语音
7. 播放语音 → 数字人视频切换状态
8. 语音结束 → 视频恢复闲置状态

## 性能优化

- 音频格式优化（使用WebM格式减少传输大小）
- 视频预加载机制
- 异步处理设计
- 资源缓存策略

## 错误处理

- 网络异常处理
- 语音处理失败提示
- AI服务不可用处理
- 友好的错误提示和恢复建议

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 开发说明

### 前端开发
- 开发服务器：`python -m http.server 8080`
- 主要文件：`frontend/index.html`、`frontend/css/style.css`、`frontend/js/main.js`

### 后端开发
- 开发服务器：`python app.py`
- 主要文件：`backend/app.py`
- API开发：在`backend/api/`目录下添加新的API蓝图

## 注意事项

1. 确保Vosk模型文件已正确下载并放置在指定路径
2. PaddleSpeech首次运行会自动下载模型文件，请确保网络连接正常
3. 语音处理功能需要浏览器支持WebRTC API
4. 数字人视频文件需要放置在`video/`目录下

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系项目开发团队。
