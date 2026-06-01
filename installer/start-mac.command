#!/bin/bash
# ═══════════════════════════════════════════════════════
#  ExamTopics Practice - macOS - Double-clic pour lancer
# ═══════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

echo ""
echo "  🎓 ExamTopics Practice"
echo "  ═══════════════════════"
echo ""

# 1. Homebrew
if ! command -v brew &> /dev/null; then
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo "  📦 Installation de Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    eval "$(brew shellenv 2>/dev/null)" 2>/dev/null
fi

if ! command -v brew &> /dev/null && [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# 2. Node.js
if ! command -v node &> /dev/null; then
    echo "  📦 Installation de Node.js..."
    brew install node
fi

# 3. Docker (optionnel)
if ! command -v docker &> /dev/null; then
    echo "  💡 Docker non installé (optionnel, pour télécharger des exams)"
    echo "     → brew install --cask docker"
    echo ""
fi

# 4. Dépendances npm
if [ ! -d "node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi

# 5. Port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "  ⚠️  Port 3000 occupé, arrêt du processus existant..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 6. Lancer
echo "  🚀 Démarrage du serveur..."
echo ""
node server.js &
SERVER_PID=$!

for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then break; fi
    sleep 0.5
done

open http://localhost:3000

echo "  ✓ Ouvert : http://localhost:3000"
echo "  ✓ Ctrl+C pour arrêter"
echo ""
wait $SERVER_PID
