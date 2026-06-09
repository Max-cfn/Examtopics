#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  ExamTopics Practice — Installeur macOS (1 ligne, sans Gatekeeper)
#
#  À coller dans le Terminal :
#    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Max-cfn/Examtopics/main/installer/install-mac.sh)"
#
#  Pourquoi ça évite l'alerte "logiciel non vérifié" :
#  curl et git clone ne posent PAS l'attribut com.apple.quarantine,
#  contrairement au téléchargement d'un .zip. Le raccourci créé sur le
#  Bureau est généré localement -> double-clic sans alerte ensuite.
# ═══════════════════════════════════════════════════════════════
set -e

REPO_URL="https://github.com/Max-cfn/Examtopics.git"
APP_DIR="$HOME/Documents/Examtopics"

echo ""
echo "  🎓 ExamTopics Practice — Installation"
echo "  ═════════════════════════════════════"
echo ""

# 1. Homebrew (ARM ou Intel) — nécessaire pour installer git si absent
if ! command -v brew &> /dev/null; then
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "  📦 Installation de Homebrew (mot de passe Mac demandé)..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [ -f /usr/local/bin/brew ]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
fi

# 2. Git — nécessaire pour cloner (clone => pas de quarantaine Gatekeeper)
if ! command -v git &> /dev/null; then
    echo "  📦 Installation de Git..."
    brew install git
fi

# 3. Clone (ou mise à jour) du dépôt
if [ -d "$APP_DIR/.git" ]; then
    echo "  🔄 Mise à jour du dépôt existant..."
    git -C "$APP_DIR" pull --ff-only 2>/dev/null || echo "  ⚠️  Mise à jour ignorée (modifications locales ?)"
else
    echo "  📥 Téléchargement (git clone) dans $APP_DIR ..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
fi

# 4. Lancement : start-mac.command installe Node/npm/Docker, crée le
#    raccourci Bureau, puis démarre le serveur et ouvre le navigateur.
chmod +x "$APP_DIR/installer/start-mac.command"
echo ""
echo "  ✅ Installé. Lancement..."
echo ""
exec "$APP_DIR/installer/start-mac.command"
