# 语音识别服务集成文档

## 环境配置

### 1. 安装依赖

在backend目录下执行以下命令安装必要依赖：

```bash
pip install -r requirements.txt
```

### 2. 配置Vosk模型

语音识别服务基于Vosk实现，需要下载模型文件：

1. 下载Vosk模型（推荐中文模型）：
   - 模型下载地址：https://alphacephei.com/vosk/models
   - 推荐模型：vosk-model-cn-0.22

2. 解压模型文件：
   - 将下载的模型文件解压到backend目录下，并重命名为`model`
   - 确保模型目录结构为：`backend/model/`

### 3. 激活conda环境

```bash
conda activate mouth
```

## 服务启动

### 1. 启动后端服务

在backend目录下执行：

```bash
python app.py
```

后端服务将在`http://127.0.0.1:5000`上运行

### 2. 启动前端服务

在frontend目录下执行：

```bash
python -m http.server 8000
```

前端服务将在`http://localhost:8000`上运行

## 功能测试

### 1. 访问前端页面

在浏览器中打开：`http://localhost:8000`

### 2. 测试语音识别

1. 点击页面上的语音按钮开始录音
2. 对着麦克风说话
3. 再次点击按钮停止录音
4. 等待识别结果显示在页面上

## API接口

### 语音识别接口（ASR）

- URL: `/api/asr`
- 方法: `POST`
- Content-Type: `multipart/form-data`
- 参数:
  - `audio`: WAV格式音频文件（单声道、16位、16000Hz）
- 返回:
  ```json
  {
    "text": "识别结果",
    "confidence": 0.9
  }
  ```

## 常见问题

### 1. Vosk模型未找到

**问题**：启动服务时显示警告：`Vosk模型文件未找到: model`

**解决方法**：
- 确保已下载Vosk模型
- 确保模型目录名称为`model`
- 确保模型目录位于backend目录下

### 2. 音频格式不兼容

**问题**：语音识别返回错误：`音频格式必须为: 单声道, 16位, 16000Hz`

**解决方法**：
- 前端已实现音频格式转换，确保浏览器支持Web Audio API
- 或使用支持格式转换的音频录制工具

### 3. 跨域请求错误

**问题**：前端无法访问后端API

**解决方法**：
- 确保后端服务和前端服务的地址配置正确
- 检查浏览器控制台的错误信息
- 确保后端CORS配置正确

## 技术栈

- 后端：Flask + Python
- 语音识别：Vosk
- 前端：HTML + CSS + JavaScript
- 音频处理：Web Audio API

## 优化建议

1. **模型优化**：根据实际需求选择合适大小的Vosk模型
2. **性能优化**：
   - 前端：优化音频采集和转换流程
   - 后端：添加异步处理和缓存机制
3. **容错机制**：
   - 添加超时处理
   - 添加重试机制
   - 优化错误提示
4. **部署优化**：
   - 使用生产级WSGI服务器（如gunicorn）
   - 配置Nginx反向代理
   - 添加HTTPS支持

## 联系方式

如有问题，请联系开发人员。
