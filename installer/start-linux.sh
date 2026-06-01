#!/bin/bash
# ═══════════════════════════════════════════════════════
#  ExamTopics Practice - Linux
# ═══════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

echo ""
echo "  🎓 ExamTopics Practice"
echo "  ═══════════════════════"
echo ""

# 1. Node.js
if ! command -v node &> /dev/null; then
    echo "  📦 Installation de Node.js..."
    if command -v apt &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt install -y nodejs
    elif command -v dnf &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs
    elif command -v pacman &> /dev/null; then
        sudo pacman -S nodejs npm
    else
        echo "  ❌ Impossible d'installer Node.js automatiquement."
        echo "     Installez-le manuellement : https://nodejs.org"
        exit 1
    fi
fi

echo "  ✓ Node.js $(node --version)"

# 2. Docker (optionnel)
if ! command -v docker &> /dev/null; then
    echo "  💡 Docker non installé (optionnel, pour télécharger des exams)"
    echo "     → curl -fsSL https://get.docker.com | sh"
    echo ""
fi

# 3. Dépendances npm
if [ ! -d "node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi

# 4. Port 3000
if command -v lsof &> /dev/null; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
elif command -v fuser &> /dev/null; then
    fuser -k 3000/tcp 2>/dev/null
fi

# 5. Lancer
echo "  🚀 Démarrage du serveur..."
echo ""
node server.js &
SERVER_PID=$!

sleep 2

# 6. Ouvrir navigateur
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v wslview &> /dev/null; then
    wslview http://localhost:3000
fi

echo "  ✓ Ouvert : http://localhost:3000"
echo "  ✓ Ctrl+C pour arrêter"
echo ""
wait $SERVER_PID
