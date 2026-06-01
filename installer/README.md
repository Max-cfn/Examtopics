# Installation

## macOS
Double-cliquez sur `start-mac.command`. Il installera automatiquement :
- Homebrew (si absent)
- Node.js (si absent)
- Les dépendances npm

## Windows
Double-cliquez sur `start-windows.bat`. Il installera automatiquement :
- Node.js via winget (si absent)
- Les dépendances npm

**Prérequis Windows** : Windows 10/11 avec winget (App Installer). Si winget n'est pas dispo, installez Node.js manuellement depuis https://nodejs.org

## Linux
```bash
chmod +x start-linux.sh
./start-linux.sh
```
Il installera Node.js via le package manager de votre distro (apt/dnf/pacman).

## Docker (optionnel)
Docker est nécessaire uniquement pour télécharger des exams depuis l'interface. Sans Docker, vous pouvez toujours importer des fichiers .md manuellement.

- **macOS** : `brew install --cask docker`
- **Windows** : `winget install Docker.DockerDesktop`
- **Linux** : `curl -fsSL https://get.docker.com | sh`
