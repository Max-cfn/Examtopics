#!/bin/bash
# ExamTopics Practice - Lancement en 1 clic
cd "$(dirname "$0")"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé. Installation..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "Installez Node.js: https://nodejs.org"
        exit 1
    fi
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Lancer le serveur et ouvrir le navigateur
echo ""
echo "  🎓 Lancement d'ExamTopics Practice..."
echo ""
node server.js &
SERVER_PID=$!

# Attendre que le serveur démarre
sleep 1

# Ouvrir dans le navigateur
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null

# Attendre la fin
wait $SERVER_PID
