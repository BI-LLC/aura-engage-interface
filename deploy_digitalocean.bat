@echo off
REM deploy.bat - Deploy AURA to DigitalOcean Droplet

echo 🚀 Starting AURA deployment to DigitalOcean...

REM Your DigitalOcean droplet IP
set DROPLET_IP=157.245.192.221

echo 📝 Updating configuration files...

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo Creating .env file...
    (
        echo # AURA Voice AI Configuration
        echo HOST=0.0.0.0
        echo PORT=8000
        echo WS_HOST=0.0.0.0
        echo WS_PORT=8765
        echo.
        echo # DigitalOcean URLs
        echo REACT_APP_API_URL=http://%DROPLET_IP%:8000
        echo REACT_APP_WS_URL=ws://%DROPLET_IP%:8765
        echo.
        echo # Database
        echo DB_HOST=postgres
        echo REDIS_HOST=redis
        echo.
        echo # API Keys - ADD YOUR KEYS HERE
        echo OPENAI_API_KEY=your_openai_key_here
        echo GROK_API_KEY=your_grok_key_here
        echo ELEVENLABS_API_KEY=your_elevenlabs_key_here
        echo ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
        echo.
        echo # API URLs
        echo GROK_API_URL=https://api.x.ai/v1
        echo OPENAI_API_URL=https://api.openai.com/v1
        echo ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
        echo.
        echo # Redis
        echo REDIS_URL=redis://localhost:6379
    ) > backend\.env
    echo ⚠️  Please add your API keys to backend\.env file
    echo    Edit: notepad backend\.env
)

echo 🏗️ Installing Python dependencies...
cd backend
pip install -r requirements.txt

echo 🚀 Starting AURA Voice AI server...
python -m app.main

echo ✅ Deployment complete!
echo.
echo 🌍 Your AURA app should be available at:
echo API: http://%DROPLET_IP%:8000
echo Health Check: http://%DROPLET_IP%:8000/health
echo Test Interface: http://%DROPLET_IP%:8000/test
echo WebSocket: ws://%DROPLET_IP%:8000/ws/voice/continuous
echo.
echo 📊 To check if it's working:
echo curl http://%DROPLET_IP%:8000/health
