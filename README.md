# P27 — Génération de code assistée et évaluation comparative

[![Tests](https://github.com/DaxxTrevA/G-n-ration-de-code-assist-e-et-valuation-comparative/actions/workflows/tests.yml/badge.svg)](https://github.com/DaxxTrevA/G-n-ration-de-code-assist-e-et-valuation-comparative/actions/workflows/tests.yml)

P27 compare du code produit par GitHub Copilot, Cursor et Qwen Coder avec
Ollama sur les mêmes exercices. L'équipe vérifie le code avec Jest et consigne
les résultats observés. Ce dépôt fournit l'infrastructure technique et les
20 exercices; il ne contient ni solutions de référence ni faux résultats.

## Comment la comparaison fonctionne

Les tâches sont des exercices de programmation, pas des questions de
connaissances. Pour chaque tâche, donnez à l'assistant le même énoncé, puis
vérifiez le code rendu avec les mêmes tests automatiques.

La répartition prévue est :

| Responsable | Outil testé |
| --- | --- |
| Personne A | GitHub Copilot |
| Personne B | Cursor avec le modèle Grok 4.7 |
| Personne C | Qwen Coder avec Ollama |

Chaque personne teste les 20 exercices avec son outil. Le tableau final contient
donc jusqu'à trois lignes par tâche, une par outil. Pour limiter les différences
dues à la manière de tester, appliquez les mêmes règles : le même énoncé, au
maximum trois essais et aucune correction manuelle du code généré entre les
essais. Collez le code brut de l'assistant dans l'interface et notez le nombre
d'essais réellement effectués.

Pour ce benchmark, le modèle utilisé dans Cursor est **Grok 4.7**. Notez
aussi le nom exact du modèle Copilot sélectionné et la variante Qwen installée
avec Ollama dans les remarques de chaque évaluation, afin que les résultats
restent reproductibles.

La fiabilité se juge sur des observations : tests réussis, nombre d'essais,
qualité, sécurité et remarques (par exemple une bibliothèque annoncée qui
n'existe pas). La qualité, la sécurité, le temps et les essais sont consignés
par l'équipe; l'application n'invente pas ces mesures. Le barème commun détaillé
est à valider par l'équipe avant le benchmark.

Les exemples chiffrés de comparaison doivent provenir des résultats réellement
collectés : aucun résultat hypothétique ne doit être présenté comme une mesure.

## Interface graphique

L'interface locale permet de lire les énoncés, coller et enregistrer une
soumission distincte pour chaque assistant, exécuter les tests et renseigner
les évaluations humaines. Les résultats s'ajoutent à `results/results.csv`.

1. Installez Node.js 20 ou plus récent.
2. À la racine du dépôt, exécutez `npm ci`.
3. Lancez `npm start`.
4. Ouvrez <http://localhost:3000>.
5. Sélectionnez une tâche et un assistant, collez la réponse générée dans
   l'éditeur, puis cliquez **Enregistrer et lancer les tests**.
6. Après avoir vérifié le code et vos notes, complétez la qualité, la sécurité,
   les essais et le temps, puis enregistrez l'évaluation.

Le code collé sera exécuté sur votre machine : relisez-le avant de lancer les
tests. Les soumissions sont stockées dans `tasks/Txx/submissions/` avec un
fichier séparé par outil (`copilot.js`, `cursor.js`, `qwen.js`). Gardez les
mêmes consignes et le même protocole pour chaque assistant.

## Tests

```sh
npm test
npm run test:T01
npm run test:T02
```

`npm run test:T01` demande quel assistant tester puis exécute les tests sur sa
soumission enregistrée. Dans l'interface, le code propre à l'assistant est
exécuté au clic sur **Enregistrer et lancer les tests**. Sans soumission, le
script indique où la saisir au lieu d'afficher un faux résultat réussi.

## Docker

Avec Docker Desktop démarré et Docker Compose v2 installé, la commande demandée
lance toute la suite de tests dans un environnement Node.js 20 :

```sh
docker compose up --build
```

Pour lancer en plus l'interface web, ouvrez un second terminal et exécutez :

```sh
docker compose --profile gui up --build
```

L'interface sera disponible sur <http://localhost:3000>. Les soumissions et le
CSV sont montés depuis le dépôt pour rester disponibles après l'arrêt des
conteneurs. Pour arrêter Docker Compose, utilisez `Ctrl+C`.

## Notation en ligne de commande

```sh
npm run evaluate -- T01
```

Le script demande d'abord quel outil a produit la soumission, lance ses tests,
puis demande les notes et mesures à saisir par l'équipe. Qualité, sécurité,
nombre d'essais et temps ne sont jamais déduits automatiquement.

## Organisation du dépôt

- `tasks/T01` à `tasks/T20` : énoncé, tests Jest et répertoire des soumissions.
- `scripts/evaluate.js` : tests et écriture des évaluations CSV.
- `scripts/server.js` et `scripts/public/` : interface web et API locales.
- `tests/` : utilitaires de chargement des soumissions et tests de l'outil.
- `results/results.csv` : tableau des évaluations observées, vide au départ.
- `.github/workflows/tests.yml` : CI exécutant Jest sur push et pull request.
- `Dockerfile` et `docker-compose.yml` : exécution reproductible.

Les énoncés couvrent des fonctions et algorithmes JavaScript, une réponse HTTP
JSON, des requêtes SQL paramétrées, l'échappement HTML, des traitements de
données, des opérations asynchrones et l'analyse CSV. Les tests donnent des
exemples et vérifient les comportements attendus; les soumissions restent le
travail des assistants comparés.

## CI et badge GitHub

Le workflow `.github/workflows/tests.yml` installe les dépendances avec
`npm ci`, puis exécute `npm test` à chaque push et pull request. Après avoir
Le badge ci-dessus suit le statut du workflow du dépôt.

## Contribution

La Personne A maintient le dépôt, les exercices, l'interface et l'infrastructure
technique. Les Personnes B et C contribuent selon la répartition du projet.
Utilisez une branche et une pull request; ne commitez jamais de mot de passe,
jeton ou clé API. Inscrivez uniquement les mesures réellement observées dans
le tableau commun.
