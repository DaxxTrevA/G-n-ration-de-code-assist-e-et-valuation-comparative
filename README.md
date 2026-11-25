# Projet P27 - Generation de code assistee et evaluation comparative

P27 compare GitHub Copilot, Cursor et Qwen Coder avec Ollama sur les memes
exercices de programmation. Les soumissions sont evaluees par des tests
automatises et les mesures completes sont saisies par les membres de l'equipe.
Aucun resultat de benchmark ni aucune solution de reference n'est fourni dans
ce depot.

## Technologies

- Node.js (20 ou plus recent) et JavaScript CommonJS
- Jest pour les tests
- Docker et Docker Compose
- GitHub Actions pour l'integration continue
- CSV avec separateur point-virgule pour Excel

## Organisation

- `tasks/T01` a `tasks/T05` : premiers exercices, leurs tests et un emplacement
  `submission.js` a creer pour la solution generee par un assistant.
- `tasks/T06` a `tasks/T20` : dossiers prets a recevoir un enonce et des tests.
- `scripts/evaluate.js` : lance les tests d'une tache et ajoute une evaluation
  renseignee par l'utilisateur dans le CSV.
- `tests/` : utilitaires de test et tests du script de notation.
- `results/results.csv` : evaluations effectives; le depot ne contient pas de
  resultats fictifs.
- `.github/workflows/tests.yml` : tests sur GitHub Actions.

## Installation

Installez Node.js 20+ puis, a la racine du depot :

```sh
npm ci
```

## Lancer les tests

```sh
npm test
npm run test:T01
npm run test:T02
```

Les scripts `test:T01` a `test:T20` sont disponibles. Pour commencer une
evaluation, placez le code genere dans `tasks/Txx/submission.js` en respectant
l'API indiquee dans le README de la tache. Les tests de tache sont marques
ignores tant que cette soumission n'existe pas : un exercice non implemente
n'est donc pas presente comme reussi.

## Docker

Avec Docker Desktop demarre et Docker Compose v2 installe :

```sh
docker compose up --build
```

Le conteneur installe les dependances de verrouillage et execute la suite Jest.

## Noter une evaluation

```sh
node scripts/evaluate.js T01
```

Le script execute les tests, puis demande l'outil utilise, la qualite (/5), la
securite (/5), le nombre d'essais, le temps en minutes et les remarques. Les
notes ne sont jamais calculees automatiquement. Une ligne est ajoutee a
`results/results.csv` apres validation. Le fichier utilise le point-virgule et
l'encodage UTF-8 avec BOM pour une ouverture plus fiable dans Excel.

## CI

La workflow GitHub Actions lance `npm ci` et `npm test` a chaque push et pull
request. Apres avoir pousse le depot, ajoutez le badge dans la section de statut
du README (remplacez `<OWNER>` et `<REPO>` par les valeurs du depot) :

```md
[![Tests](https://github.com/<OWNER>/<REPO>/actions/workflows/tests.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/tests.yml)
```

## Contribution

Chaque membre peut completer les exercices qui lui sont attribues, ajouter des
tests reproductibles et documenter les changements. Conservez les solutions
produites par chaque assistant separement pendant l'experimentation; seul le
fichier `submission.js` actif est importe par les tests. Saisissez les mesures
observees dans le CSV, sans inventer ni modifier les resultats d'execution.
Utilisez une branche et une pull request pour les changements, et verifiez
`npm test` avant de contribuer.
