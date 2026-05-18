#!/bin/bash
# ============================================
# CortexNote + OpenClaw — VPS Deployment Script
# Tested on Ubuntu 22.04 / 24.04
# ============================================

set -e

echo "🚀 CortexNote + OpenClaw VPS Setup"
echo "===================================="

# --- 1. System Update ---
echo ""
echo "📦 [1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# --- 2. Install Node.js 24 ---
echo ""
echo "📦 [2/6] Installing Node.js 24..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 22 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "   Node.js: $(node -v)"
echo "   npm: $(npm -v)"

# --- 3. Install OpenClaw ---
echo ""
echo "📦 [3/6] Installing OpenClaw..."
if ! command -v openclaw &> /dev/null; then
    curl -fsSL https://openclaw.ai/install.sh | bash
fi
echo "   OpenClaw installed."

# --- 4. Configure OpenClaw ---
echo ""
echo "⚙️  [4/6] Setting up OpenClaw..."
echo ""
echo "   You need to run the onboarding wizard to configure your AI provider."
echo "   Run this command and follow the prompts:"
echo ""
echo "     openclaw onboard --install-daemon"
echo ""
echo "   This will set up your model provider (Anthropic/OpenAI/Google/etc.)"
echo "   and start the Gateway daemon on port 18789."
echo ""
read -p "   Press Enter after you've completed onboarding..."

# Verify gateway
openclaw gateway status || echo "⚠️  Gateway not running. Start it with: openclaw gateway --port 18789"

# --- 5. Clone & Setup CortexNote ---
echo ""
echo "📦 [5/6] Setting up CortexNote..."

INSTALL_DIR="/opt/cortexnote"
if [ ! -d "$INSTALL_DIR" ]; then
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"
    
    echo "   Cloning repository..."
    git clone https://github.com/popazovlegend/CBER_cvs.git "$INSTALL_DIR/repo"
    cd "$INSTALL_DIR/repo/notebook-lm-web"
else
    cd "$INSTALL_DIR/repo/notebook-lm-web"
    echo "   Pulling latest changes..."
    git pull
fi

echo "   Installing dependencies..."
npm install

# Create production .env
if [ ! -f ".env.local" ]; then
    echo "   Creating .env.local..."
    
    # Generate random session secret
    SESSION_SECRET=$(openssl rand -hex 32)
    
    cat > .env.local << EOF
# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_MODEL=openclaw

# Session Secret (auto-generated)
SESSION_SECRET=${SESSION_SECRET}
EOF
    echo "   ✅ .env.local created with auto-generated SESSION_SECRET"
fi

# Build for production
echo "   Building for production..."
npm run build

# --- 6. Create systemd service ---
echo ""
echo "📦 [6/6] Setting up systemd service..."

sudo tee /etc/systemd/system/cortexnote.service > /dev/null << EOF
[Unit]
Description=CortexNote Web Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/repo/notebook-lm-web
ExecStart=$(which node) node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cortexnote
sudo systemctl start cortexnote

echo ""
echo "============================================"
echo "✅ Deployment complete!"
echo ""
echo "   CortexNote:  http://$(hostname -I | awk '{print $1}'):3000"
echo "   OpenClaw:    http://localhost:18789 (internal)"
echo ""
echo "   Useful commands:"
echo "     sudo systemctl status cortexnote"
echo "     sudo systemctl restart cortexnote"
echo "     openclaw gateway status"
echo "     openclaw logs --follow"
echo ""
echo "   For HTTPS, set up Nginx reverse proxy + Certbot:"
echo "     sudo apt install nginx certbot python3-certbot-nginx"
echo "============================================"
