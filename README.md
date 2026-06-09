# 🎓 ExamTopics Practice

Site local pour s'entraîner aux certifications IT à partir des questions téléchargées via [examtopics-downloader](https://github.com/thatonecodes/examtopics-downloader).

## Installation

### 🍎 macOS — installation en 1 ligne

Ouvrez **Terminal** (Spotlight → tapez « Terminal ») et collez cette commande :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Max-cfn/Examtopics/main/installer/install-mac.sh)"
```

Elle installe tout (Homebrew, Node.js, Git), télécharge l'app, la lance, et crée
un raccourci **« ExamTopics Practice »** sur le Bureau. **Les fois suivantes :
double-clic sur le raccourci du Bureau** (2 clics, sans alerte).

> **Pourquoi pas un simple double-clic au départ ?** macOS (Gatekeeper) bloque
> les scripts téléchargés en `.zip` (« logiciel non vérifié »). L'installation via
> `curl`/`git clone` évite ce blocage — aucun fichier n'est mis en quarantaine,
> et le raccourci du Bureau est créé localement.

### 🪟 Windows

Téléchargez le dépôt, puis double-cliquez sur `installer/start-windows.bat`.
Il installe Node.js (via winget) et les dépendances au premier lancement.

### 🐧 Linux

```bash
git clone https://github.com/Max-cfn/Examtopics.git ~/Examtopics
cd ~/Examtopics && ./installer/start-linux.sh
```

Le site s'ouvre sur **http://localhost:3000**.

## Fonctionnalités

- **Bibliothèque de certifications** classée par provider (AWS, Cisco, Google, etc.)
- **Mode Examen** : timer, batch de X questions, résultats détaillés à la fin
- **Mode Entraînement** : feedback immédiat avec discussions de la communauté
- **Sélection par plage** : toutes, les X dernières, les X premières, ou plage personnalisée
- **Multi-réponses** : support des questions à choix multiples (2-3 réponses attendues)
- **Discussions ExamTopics** : réponses et explications de la communauté intégrées
- **Lien direct** vers chaque question sur ExamTopics
- **Téléchargement intégré** via Docker depuis l'interface
- **Raccourcis clavier** : A-F pour sélectionner, ←→ pour naviguer, Enter pour valider

## Ajouter des questions

### Depuis l'interface
- Cliquez "Importer un fichier .md" pour charger un fichier existant
- Cliquez "Télécharger depuis ExamTopics" pour scraper via Docker (nécessite Docker)

### Manuellement
Placez vos fichiers `.md` dans le dossier `exams/`. Ils apparaîtront au prochain lancement.

### Via Docker en ligne de commande
```bash
docker run --name examtopics-dl \
  ghcr.io/thatonecodes/examtopics-downloader:latest \
  -p amazon -s "aws-certified-solutions-architect-professional-sap-c02" \
  -c -save-links -o output.md
docker cp examtopics-dl:/app/output.md ./exams/aws-sap-c02.md
docker rm examtopics-dl
```

> Le flag `-c` est important : il inclut les discussions de la communauté (réponses, explications, votes).

## Providers disponibles

amazon, cisco, comptia, google, microsoft, isc2, fortinet, juniper, isaca, vmware, servicenow, ec-council, oracle, paloaltonetworks

[Liste complète des exams](https://github.com/thatonecodes/examtopics-downloader#exam-providers--p)

## Structure

```
├── installer/              # Scripts de lancement (double-clic)
│   ├── start-mac.command
│   ├── start-windows.bat
│   ├── start-linux.sh
│   └── README.md
├── public/                 # Frontend
│   ├── index.html
│   ├── style.css
│   ├── parser.js
│   └── app.js
├── exams/                  # Vos fichiers de questions (.md, gitignored)
├── server.js               # Serveur Express (API + static)
├── package.json
├── start.sh                # Lanceur alternatif (terminal)
└── README.md
```
