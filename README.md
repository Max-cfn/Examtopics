# 🎓 ExamTopics Practice

Site local pour s'entraîner aux examens à partir des questions téléchargées via [examtopics-downloader](https://github.com/thatonecodes/examtopics-downloader).

## Lancement en 1 clic

```bash
./start.sh
```

Ça installe les dépendances si nécessaire, lance le serveur, et ouvre le navigateur sur http://localhost:3000.

Alternativement :
```bash
npm start
```

## Fonctionnalités

- **Bibliothèque de certifications** : vos exams téléchargés sont listés au lancement, cliquez pour commencer
- **Mode Examen** : conditions réelles avec timer, batch de X questions, résultats détaillés
- **Mode Entraînement** : review immédiate de chaque réponse avec explications
- **Lien ExamTopics** : chaque question contient un lien direct vers la page officielle
- **Import facile** : importez un fichier .md directement depuis l'interface
- **Téléchargement intégré** : téléchargez depuis ExamTopics via Docker (optionnel)
- **Raccourcis clavier** : A-F pour sélectionner, ←→ pour naviguer, Enter pour valider

## Ajouter des questions

### Option 1 : Import depuis l'interface
Cliquez "Importer un fichier .md" et sélectionnez votre fichier.

### Option 2 : Copier dans le dossier exams/
Placez vos fichiers `.md` directement dans le dossier `exams/`.

### Option 3 : Télécharger via Docker
```bash
docker pull ghcr.io/thatonecodes/examtopics-downloader:latest
docker run -it --name examtopics-dl \
  ghcr.io/thatonecodes/examtopics-downloader:latest \
  -p cisco -s 200-301 -save-links -o output.md
docker cp examtopics-dl:/app/output.md ./exams/cisco_200-301.md
docker rm examtopics-dl
```

### Option 4 : Avec Go
```bash
git clone https://github.com/thatonecodes/examtopics-downloader
cd examtopics-downloader
go run ./cmd/main.go -p cisco -s 200-301 -save-links -o output.md
cp output.md /chemin/vers/Examtopics/exams/cisco_200-301.md
```

## Providers disponibles

| Provider | Description |
|----------|-------------|
| amazon | AWS Certifications |
| cisco | Cisco (CCNA, CCNP...) |
| comptia | CompTIA (A+, Security+...) |
| google | Google Cloud |
| microsoft | Microsoft (Azure, M365...) |
| isc2 | ISC2 (CISSP...) |
| fortinet | Fortinet (NSE...) |
| ec-council | EC-Council (CEH...) |
| ... | [Liste complète](https://github.com/thatonecodes/examtopics-downloader#exam-providers--p) |

## Structure

```
├── start.sh            # Lancement en 1 clic
├── server.js           # Serveur Express (API + static)
├── package.json        # Dépendances
├── public/             # Frontend
│   ├── index.html
│   ├── style.css
│   ├── parser.js
│   └── app.js
└── exams/              # Vos fichiers de questions (.md)
    └── cisco_200-301_sample.md
```
