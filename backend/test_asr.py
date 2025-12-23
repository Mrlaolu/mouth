import requests

# 测试ASR接口
def test_asr():
    url = 'http://127.0.0.1:5000/api/asr'
    
    # 读取音频文件
    with open('output.wav', 'rb') as f:
        audio_data = f.read()
    
    # 发送请求
    files = {'audio': ('output.wav', audio_data, 'audio/wav')}
    response = requests.post(url, files=files)
    
    # 打印结果
    print(f'Status code: {response.status_code}')
    print(f'Response: {response.json()}')

if __name__ == '__main__':
    test_asr()
