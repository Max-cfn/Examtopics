# Installer

Scripts de lancement en 1 clic. Double-cliquez sur celui de votre OS.

## macOS → installation en 1 ligne (recommandé)

Ouvrez **Terminal** et collez :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Max-cfn/Examtopics/main/installer/install-mac.sh)"
```

`install-mac.sh` installe Homebrew + Node.js + Git, fait un `git clone` du dépôt
dans `~/Documents/Examtopics`, puis lance `start-mac.command`. Un raccourci
**« ExamTopics Practice »** est créé sur le Bureau.

**Les fois suivantes : double-clic sur le raccourci du Bureau** (2 clics, sans alerte).

> **Pourquoi pas le double-clic direct du `.command` ?** Téléchargé dans un `.zip`,
> macOS le met en quarantaine (`com.apple.quarantine`) et Gatekeeper le bloque
> (« logiciel non vérifié »), car le script n'est ni signé ni notarisé par Apple.
> `curl` et `git clone` ne posent pas cet attribut → pas de blocage. Le raccourci
> du Bureau étant créé localement, il n'est pas quarantiné non plus.
>
> Si tu as quand même un `start-mac.command` bloqué (récupéré via zip) :
> clic droit → **Ouvrir**, ou retire la quarantaine : `xattr -cr <dossier>`.

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
