# 语音服务部署与API文档

## 1. 环境配置

### 1.1 安装依赖

#### 使用conda环境（推荐）
```bash
# 创建conda环境
conda create -n mouth python=3.8

# 激活环境
conda activate mouth

# 安装依赖
pip install -r requirements.txt
```

#### 使用虚拟环境
```bash
# 创建虚拟环境
python -m venv venv

# 激活环境（Windows）
venv\Scripts\activate

# 激活环境（Linux/Mac）
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 1.2 配置Vosk模型（语音识别）

语音识别服务基于Vosk实现，需要下载并配置中文模型：

1. 下载Vosk中文模型：
   ```bash
   # 方式1：使用PowerShell
   Invoke-WebRequest -Uri https://alphacephei.com/vosk/models/vosk-model-cn-0.22.zip -OutFile vosk-model-cn-0.22.zip
   
   # 方式2：使用curl
   curl -O https://alphacephei.com/vosk/models/vosk-model-cn-0.22.zip
   ```

2. 解压模型文件：
   ```bash
   # PowerShell
   Expand-Archive -Path vosk-model-cn-0.22.zip -DestinationPath .
   
   # Linux/Mac
   unzip vosk-model-cn-0.22.zip
   ```

3. 重命名模型目录：
   ```bash
   # PowerShell
   Rename-Item -Path vosk-model-cn-0.22 -NewName model
   
   # Linux/Mac
   mv vosk-model-cn-0.22 model
   ```

4. 确保模型目录结构：
   ```
   backend/
   └── model/
       ├── am/
       ├── conf/
       ├── graph/
       ├── ivector/
       └── rescore/
   ```

## 2. 服务启动

### 2.1 开发环境

```bash
# 启动开发服务器
python app.py
```

服务将在 `http://localhost:5000` 运行。

### 2.2 生产环境

使用gunicorn作为生产服务器：

```bash
# 启动生产服务器
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

- `-w 4`: 使用4个worker进程
- `-b 0.0.0.0:5000`: 绑定到所有网络接口的5000端口

## 3. API使用说明

### 3.1 语音合成接口

#### 接口URL
```
POST /api/tts
```

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| text | string | 是 | - | 待合成文本，长度限制1000字符 |
| speed | float | 否 | 1.0 | 语速，范围0.5-2.0 |
| volume | float | 否 | 1.0 | 音量，范围0.0-1.0 |
| pitch | float | 否 | 1.0 | 音调，范围0.5-2.0 |
| format | string | 否 | wav | 输出格式，支持wav和mp3 |

#### 请求示例

```bash
curl -X POST -H "Content-Type: application/json" -d '{"text":"你好，这是PaddleSpeech语音合成示例","speed":1.0,"volume":1.0,"pitch":1.0,"format":"wav"}' http://localhost:5000/api/tts -o output.wav
```

#### 响应示例

- 成功响应：
  - 状态码：200 OK
  - 响应体：音频文件流
  - Content-Type：audio/wav 或 audio/mpeg

- 失败响应：
  ```json
  {
    "error": "错误信息"
  }
  ```

### 3.2 语音识别接口（ASR）

#### 接口URL
```
POST /api/asr
```

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| audio | file | 是 | - | WAV格式音频文件（单声道、16位、16000Hz） |

#### 请求示例

```bash
# 使用curl
curl -X POST -F 'audio=@output.wav' http://localhost:5000/api/asr

# 使用Python requests
import requests
url = 'http://localhost:5000/api/asr'
files = {'audio': ('output.wav', open('output.wav', 'rb'), 'audio/wav')}
response = requests.post(url, files=files)
print(response.json())
```

#### 响应示例

- 成功响应：
  ```json
  {
    "text": "识别结果文本",
    "confidence": 0.9
  }
  ```

- 失败响应：
  ```json
  {
    "error": "错误信息"
  }
  ```

### 3.3 其他接口

#### 获取路由列表
```
GET /routes
```

返回所有注册的路由信息。

## 4. 服务配置

### 4.1 日志配置

日志配置在 `app.py` 中，默认记录到：
- 控制台
- `tts_service.log` 文件

日志级别默认为INFO，可在代码中修改。

### 4.2 CORS配置

默认允许来自以下源的跨域请求：
- http://localhost:8000
- http://127.0.0.1:8000

可在 `app.py` 中修改CORS配置。

## 5. 性能优化

### 5.1 并发处理

使用gunicorn时，可根据服务器配置调整worker数量：

```bash
# 根据CPU核心数调整
gunicorn -w $(nproc) -b 0.0.0.0:5000 app:app
```

### 5.2 模型优化

当前使用的是PaddleSpeech的预训练模型，可根据需要替换为其他模型。

## 6. 错误处理

### 6.1 常见错误

| 错误码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | Text is required | 缺少text参数（TTS） |
| 400 | 文本不能为空 | text参数为空（TTS） |
| 400 | 文本长度不能超过1000字符 | 文本长度超过限制（TTS） |
| 400 | Audio file is required | 缺少audio参数（ASR） |
| 400 | 音频格式必须为: 单声道, 16位, 16000Hz | 音频格式不符合要求（ASR） |
| 500 | 语音合成失败，请稍后重试 | 服务内部错误（TTS） |
| 500 | 语音识别失败，请稍后重试 | 服务内部错误（ASR） |
| 500 | 语音识别模型未加载，请下载并配置Vosk模型 | Vosk模型未正确配置（ASR） |

### 6.2 日志查看

```bash
# 查看日志文件
tail -f tts_service.log
```

## 7. 技术栈

- **Web框架**: Flask
- **TTS引擎**: PaddleSpeech
- **ASR引擎**: Vosk
- **音频处理**: pydub
- **生产服务器**: gunicorn
- **跨域支持**: flask-cors

## 8. 版本信息

- PaddleSpeech: 最新版
- Vosk: 最新版
- Python: 3.8+
- Flask: 最新版
