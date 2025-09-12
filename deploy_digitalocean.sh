#!/bin/bash
# deploy.sh - Deploy AURA to DigitalOcean Droplet

set -e

echo "🚀 Starting AURA deployment to DigitalOcean..."

# Your DigitalOcean droplet IP
DROPLET_IP="157.245.192.221"

echo "📝 Updating configuration files..."

# Update docker-compose.yml with actual IP (if it exists)
if [ -f "docker-compose.yml" ]; then
    sed -i "s/YOUR_DROPLET_IP/$DROPLET_IP/g" docker-compose.yml
fi

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "Creating .env file..."
    cat > backend/.env << EOF
# AURA Voice AI Configuration
HOST=0.0.0.0
PORT=8000
WS_HOST=0.0.0.0
WS_PORT=8765

# DigitalOcean URLs
REACT_APP_API_URL=http://$DROPLET_IP:8000
REACT_APP_WS_URL=ws://$DROPLET_IP:8765

# Database
DB_HOST=postgres
REDIS_HOST=redis

# API Keys - ADD YOUR KEYS HERE
OPENAI_API_KEY=your_openai_key_here
GROK_API_KEY=your_grok_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# API URLs
GROK_API_URL=https://api.x.ai/v1
OPENAI_API_URL=https://api.openai.com/v1
ELEVENLABS_API_URL=https://api.elevenlabs.io/v1

# Redis
REDIS_URL=redis://localhost:6379
EOF
    echo "⚠️  Please add your API keys to backend/.env file"
    echo "   Edit: nano backend/.env"
fi

echo "🔥 Installing Docker and Docker Compose..."
# Install Docker if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. You may need to log out and back in."
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo "🏗️ Building and starting services..."
cd backend

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🚀 Starting AURA Voice AI server..."
# Start the server directly (not with Docker for now)
python -m app.main &

# Get the process ID
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 10

echo "🔍 Checking if server is running..."
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running (PID: $SERVER_PID)"
else
    echo "❌ Server failed to start"
    exit 1
fi

echo "🌐 Opening firewall ports..."
# Open necessary ports
sudo ufw allow 8000/tcp  # API
sudo ufw allow 8765/tcp  # WebSocket
sudo ufw allow 3000/tcp  # Frontend (if needed)

echo "✅ Deployment complete!"
echo ""
echo "🌍 Your AURA app should be available at:"
echo "API: http://$DROPLET_IP:8000"
echo "Health Check: http://$DROPLET_IP:8000/health"
echo "Test Interface: http://$DROPLET_IP:8000/test"
echo "WebSocket: ws://$DROPLET_IP:8000/ws/voice/continuous"
echo ""
echo "📊 To check if it's working:"
echo "curl http://$DROPLET_IP:8000/health"
echo ""
echo "🔧 To stop the server:"
echo "kill $SERVER_PID"
echo ""
echo "📝 To update:"
echo "git pull && kill $SERVER_PID && python -m app.main &"
