#!/bin/bash
# ExamTopics Practice - Lancement en 1 clic
# Fonctionne depuis n'importe quel emplacement
cd "$(dirname "$0")"
APP_DIR="$(pwd)"

# Trouver Homebrew (macOS - ARM ou Intel)
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

echo ""
echo "  🎓 ExamTopics Practice"
echo "  ═══════════════════════"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js non trouvé. Installation..."
    if command -v brew &> /dev/null; then
        brew install node
    elif command -v apt &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        echo "  Installez Node.js: https://nodejs.org"
        exit 1
    fi
fi

# Installer les dépendances si nécessaire
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "  📦 Installation des dépendances..."
    npm install --silent
fi

# Mettre à jour si package.json a changé
if [ "$APP_DIR/package.json" -nt "$APP_DIR/node_modules/.package-lock.json" ] 2>/dev/null; then
    npm install --silent
fi

# Lancer Docker Desktop si installé mais pas actif (macOS)
if command -v docker &> /dev/null; then
    if ! docker info &> /dev/null 2>&1; then
        if [ "$(uname)" = "Darwin" ]; then
            echo "  🐳 Démarrage de Docker Desktop..."
            open -a Docker 2>/dev/null
        fi
        for i in $(seq 1 30); do
            if docker info &> /dev/null 2>&1; then break; fi
            sleep 1
        done
        if docker info &> /dev/null 2>&1; then
            echo "  ✓ Docker prêt"
        else
            echo "  ⚠️  Docker met du temps à démarrer, le téléchargement sera dispo plus tard"
        fi
    fi
fi

# Libérer le port 3000
if command -v lsof &> /dev/null; then
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
elif command -v fuser &> /dev/null; then
    fuser -k 3000/tcp 2>/dev/null
fi
sleep 0.5

# Lancer le serveur
echo "  🚀 Démarrage du serveur..."
echo ""
node "$APP_DIR/server.js" &
SERVER_PID=$!

# Attendre que le serveur soit prêt
for i in $(seq 1 10); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then break; fi
    sleep 0.5
done

# Ouvrir dans le navigateur
if [ "$(uname)" = "Darwin" ]; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v wslview &> /dev/null; then
    wslview http://localhost:3000
fi

echo "  ✓ Ouvert : http://localhost:3000"
echo "  ✓ Ctrl+C pour arrêter"
echo ""
wait $SERVER_PID
