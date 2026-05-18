#!/bin/bash
# ============================================
# CortexNote — VPS Deployment Script
# Uses OpenRouter API (free, works worldwide)
# Tested on Ubuntu 22.04 / 24.04
# ============================================

set -e

echo "🚀 CortexNote VPS Setup"
echo "===================================="

# --- 1. System Update ---
echo ""
echo "📦 [1/4] Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# --- 2. Install Node.js 24 ---
echo ""
echo "📦 [2/4] Installing Node.js 24..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 22 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "   Node.js: $(node -v)"
echo "   npm: $(npm -v)"

# --- 3. Clone & Setup CortexNote ---
echo ""
echo "📦 [3/4] Setting up CortexNote..."

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
    echo ""
    echo "⚙️  Setting up environment..."
    echo ""
    read -p "   Enter your OpenRouter API key (get free at https://openrouter.ai/keys): " OPENROUTER_KEY
    
    SESSION_SECRET=$(openssl rand -hex 32)
    
    cat > .env.local << EOF
# OpenRouter API
OPENROUTER_API_KEY=${OPENROUTER_KEY}
OPENROUTER_MODEL=google/gemma-2-9b-it:free
OPENROUTER_VISION_MODEL=google/gemma-2-9b-it:free
SITE_URL=http://$(hostname -I | awk '{print $1}'):3000

# Session Secret (auto-generated)
SESSION_SECRET=${SESSION_SECRET}
EOF
    echo "   ✅ .env.local created"
fi

# Build for production
echo "   Building for production..."
npm run build

# --- 4. Create systemd service ---
echo ""
echo "📦 [4/4] Setting up systemd service..."

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

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "============================================"
echo "✅ Deployment complete!"
echo ""
echo "   CortexNote: http://${SERVER_IP}:3000"
echo "   AI Backend: OpenRouter (free tier)"
echo ""
echo "   Useful commands:"
echo "     sudo systemctl status cortexnote"
echo "     sudo systemctl restart cortexnote"
echo "     journalctl -u cortexnote -f"
echo ""
echo "   For HTTPS with your domain:"
echo "     1. Point your domain DNS to ${SERVER_IP}"
echo "     2. Edit /etc/nginx/sites-available/cortexnote"
echo "     3. sudo certbot --nginx -d your-domain.com"
echo "============================================"
