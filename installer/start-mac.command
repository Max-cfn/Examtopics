#!/bin/bash
# ═══════════════════════════════════════════════════════
#  ExamTopics Practice - macOS - Double-clic pour lancer
# ═══════════════════════════════════════════════════════
REPO_URL="https://github.com/Max-cfn/Examtopics.git"

# Déterminer le répertoire du script et remonter au repo
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Si lancé depuis installer/, remonter d'un niveau
if [ "$(basename "$SCRIPT_DIR")" = "installer" ]; then
    APP_DIR="$(dirname "$SCRIPT_DIR")"
else
    APP_DIR="$SCRIPT_DIR"
fi

echo ""
echo "  🎓 ExamTopics Practice"
echo "  ═══════════════════════"
echo ""

# 1. Homebrew (ARM ou Intel Mac)
if ! command -v brew &> /dev/null; then
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "  📦 Installation de Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
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
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi
if [ "$APP_DIR/package.json" -nt "$APP_DIR/node_modules/.package-lock.json" ] 2>/dev/null; then
    echo "  📦 Mise à jour des dépendances..."
    npm install --silent
fi

# 6. Docker (optionnel) - démarrer si installé mais pas actif
if command -v docker &> /dev/null; then
    if ! docker info &> /dev/null 2>&1; then
        echo "  🐳 Démarrage de Docker Desktop..."
        open -a Docker 2>/dev/null
        for i in $(seq 1 30); do
            if docker info &> /dev/null 2>&1; then break; fi
            sleep 1
        done
        if docker info &> /dev/null 2>&1; then
            echo "  ✓ Docker prêt"
        else
            echo "  ⚠️  Docker met du temps à démarrer, les téléchargements seront dispo plus tard"
        fi
    fi
else
    echo "  💡 Docker non installé (optionnel, pour télécharger des exams)"
    echo ""
fi

# 7. Créer raccourci Bureau si absent
DESKTOP_SHORTCUT="$HOME/Desktop/ExamTopics Practice.command"
if [ ! -f "$DESKTOP_SHORTCUT" ]; then
    echo "  🖥️  Création du raccourci sur le Bureau..."
    cat > "$DESKTOP_SHORTCUT" << SHORTCUT
#!/bin/bash
exec "$APP_DIR/installer/start-mac.command"
SHORTCUT
    chmod +x "$DESKTOP_SHORTCUT"
fi

# 8. Libérer le port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 9. Lancer
echo "  🚀 Démarrage du serveur..."
echo ""
node "$APP_DIR/server.js" &
SERVER_PID=$!

for i in $(seq 1 10); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then break; fi
    sleep 0.5
done

open http://localhost:3000

echo "  ✓ Ouvert : http://localhost:3000"
echo "  ✓ Ctrl+C pour arrêter"
echo ""
wait $SERVER_PID
