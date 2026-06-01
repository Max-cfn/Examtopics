# Installer

Scripts de lancement en 1 clic. Double-cliquez sur celui de votre OS.

## macOS → `start-mac.command`

Double-cliquez dans le Finder. Au premier lancement il installe :
- Homebrew (si absent)
- Node.js (si absent)
- Dépendances npm

Les fois suivantes il lance directement (~2s).

> Si macOS bloque l'exécution : clic droit → Ouvrir → Ouvrir quand même.

## Windows → `start-windows.bat`

Double-cliquez. Au premier lancement il installe :
- Node.js via winget (si absent)
- Dépendances npm

**Prérequis** : Windows 10/11 avec winget (inclus par défaut). Si winget n'est pas disponible, installez Node.js depuis https://nodejs.org puis relancez le script.

## Linux → `start-linux.sh`

```bash
chmod +x start-linux.sh
./start-linux.sh
```

Installe Node.js via apt (Debian/Ubuntu), dnf (Fedora), ou pacman (Arch).

## Docker (optionnel)

Docker est nécessaire uniquement pour télécharger des exams depuis l'interface web. Sans Docker, importez vos fichiers `.md` manuellement.

| OS | Installation Docker |
|----|-------------------|
| macOS | `brew install --cask docker` |
| Windows | `winget install Docker.DockerDesktop` |
| Linux | `curl -fsSL https://get.docker.com \| sh` |

## Arrêter le serveur

Fermez la fenêtre du terminal / CMD, ou appuyez sur `Ctrl+C`.
