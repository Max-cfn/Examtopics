#!/bin/bash
# ═══════════════════════════════════════════════════════
#  ExamTopics Practice - macOS - Double-clic pour lancer
# ═══════════════════════════════════════════════════════
REPO_URL="https://github.com/Max-cfn/Examtopics.git"
APP_DIR="$HOME/Documents/Examtopics"

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
fi
if ! command -v brew &> /dev/null && [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# 2. Node.js
if ! command -v node &> /dev/null; then
    echo "  📦 Installation de Node.js..."
    brew install node
fi

# 3. Git
if ! command -v git &> /dev/null; then
    echo "  📦 Installation de Git..."
    brew install git
fi

# 4. Clone or update repo
if [ ! -d "$APP_DIR/.git" ]; then
    echo "  📥 Clonage du repo..."
    git clone "$REPO_URL" "$APP_DIR"
else
    echo "  🔄 Mise à jour..."
    cd "$APP_DIR"
    git pull --ff-only 2>/dev/null || echo "  ⚠️  Mise à jour impossible (modifications locales ?)"
fi

cd "$APP_DIR"

# 5. Dépendances npm
if [ ! -d "node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi

# Check if package.json changed (new deps)
if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    echo "  📦 Mise à jour des dépendances..."
    npm install --silent
fi

# 6. Docker (optionnel)
if ! command -v docker &> /dev/null; then
    echo "  💡 Docker non installé (optionnel, pour télécharger des exams)"
    echo ""
fi

# 7. Créer raccourci Bureau si absent
DESKTOP_SHORTCUT="$HOME/Desktop/ExamTopics Practice.command"
if [ ! -f "$DESKTOP_SHORTCUT" ]; then
    echo "  🖥️  Création du raccourci sur le Bureau..."
    cat > "$DESKTOP_SHORTCUT" << 'SHORTCUT'
#!/bin/bash
exec "$HOME/Documents/Examtopics/installer/start-mac.command"
SHORTCUT
    chmod +x "$DESKTOP_SHORTCUT"
fi

# 8. Port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 9. Lancer
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
