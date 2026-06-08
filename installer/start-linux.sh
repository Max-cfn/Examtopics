#!/bin/bash
# ═══════════════════════════════════════════════════════
#  ExamTopics Practice - Linux
# ═══════════════════════════════════════════════════════
REPO_URL="https://github.com/Max-cfn/Examtopics.git"

# Déterminer le répertoire
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$(basename "$SCRIPT_DIR")" = "installer" ]; then
    APP_DIR="$(dirname "$SCRIPT_DIR")"
else
    APP_DIR="$SCRIPT_DIR"
fi

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
        sudo pacman -S --noconfirm nodejs npm
    else
        echo "  ❌ Installez Node.js manuellement : https://nodejs.org"
        exit 1
    fi
fi
echo "  ✓ Node.js $(node --version)"

# 2. Git
if ! command -v git &> /dev/null; then
    echo "  📦 Installation de Git..."
    if command -v apt &> /dev/null; then sudo apt install -y git;
    elif command -v dnf &> /dev/null; then sudo dnf install -y git;
    elif command -v pacman &> /dev/null; then sudo pacman -S --noconfirm git; fi
fi

# 3. Clone or update
if [ ! -d "$APP_DIR/.git" ]; then
    echo "  📥 Clonage du repo..."
    git clone "$REPO_URL" "$APP_DIR"
else
    echo "  🔄 Mise à jour..."
    cd "$APP_DIR"
    git pull --ff-only 2>/dev/null || echo "  ⚠️  Mise à jour impossible"
fi

cd "$APP_DIR"

# 4. Dépendances
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi
if [ "$APP_DIR/package.json" -nt "$APP_DIR/node_modules/.package-lock.json" ] 2>/dev/null; then
    npm install --silent
fi

# 5. Docker (optionnel)
if command -v docker &> /dev/null; then
    if ! docker info &> /dev/null 2>&1; then
        echo "  🐳 Docker installé mais pas actif. Lancez: sudo systemctl start docker"
    fi
else
    echo "  💡 Docker non installé (optionnel)"
fi

# 6. Créer raccourci Bureau
DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
if [ -d "$DESKTOP" ] && [ ! -f "$DESKTOP/ExamTopics Practice.desktop" ]; then
    echo "  🖥️  Création du raccourci Bureau..."
    cat > "$DESKTOP/ExamTopics Practice.desktop" << EOF
[Desktop Entry]
Type=Application
Name=ExamTopics Practice
Exec=bash -c "$APP_DIR/installer/start-linux.sh"
Terminal=true
Icon=applications-education
Categories=Education;
EOF
    chmod +x "$DESKTOP/ExamTopics Practice.desktop"
fi

# 7. Port 3000
if command -v lsof &> /dev/null; then
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
elif command -v fuser &> /dev/null; then
    fuser -k 3000/tcp 2>/dev/null
fi
sleep 0.5

# 8. Lancer
echo "  🚀 Démarrage du serveur..."
echo ""
node "$APP_DIR/server.js" &
SERVER_PID=$!

for i in $(seq 1 10); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then break; fi
    sleep 0.5
done

if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v wslview &> /dev/null; then
    wslview http://localhost:3000
fi

echo "  ✓ Ouvert : http://localhost:3000"
echo "  ✓ Ctrl+C pour arrêter"
echo ""
wait $SERVER_PID
