# 🎓 ExamTopics Practice

Site local pour s'entraîner aux certifications IT à partir des questions téléchargées via [examtopics-downloader](https://github.com/thatonecodes/examtopics-downloader).

## Lancement

Double-cliquez sur le fichier correspondant à votre OS dans le dossier `installer/` :

| OS | Fichier | Action |
|----|---------|--------|
| macOS | `installer/start-mac.command` | Double-clic dans le Finder |
| Windows | `installer/start-windows.bat` | Double-clic |
| Linux | `installer/start-linux.sh` | `./installer/start-linux.sh` |

Le script installe tout automatiquement au premier lancement (Node.js, dépendances), puis lance directement les fois suivantes.

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
