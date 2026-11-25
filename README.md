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
| Personne A | Cursor avec Grok 4.7 |
| Personne B | GitHub Copilot |
| Personne C | Cline avec Qwen2.5-Coder 7B dans Ollama |

Chaque personne teste les 20 exercices avec son outil. Le tableau final contient
jusqu'à neuf lignes par tâche si chaque outil a besoin de ses trois essais.
À la première tentative, envoyez l'énoncé tel quel; après un échec, envoyez
uniquement l'erreur exacte des tests. Ne modifiez pas manuellement le code et
arrêtez-vous à la première réussite ou après trois essais.

La fiabilité se juge sur les cinq critères de la
[grille d'évaluation](./docs/grille-evaluation.md) : justesse, qualité,
sécurité, temps et itérations, hallucinations. Les tests, le temps et le nombre
de tentatives sont consignés séparément des notes. Consultez le
[protocole commun](./docs/protocole-benchmark.md) avant de tester.

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
5. Sélectionnez une tâche et votre outil attribué. Copiez le prompt affiché et
   envoyez-le tel quel à l'assistant.
6. Collez sa réponse brute, indiquez le modèle exact si demandé, puis cliquez
   **Enregistrer et lancer les tests**.
7. Saisissez les notes de la grille et le temps écoulé après chaque tentative.
   En cas d'échec, copiez le message d'erreur affiché pour la tentative suivante.
8. Ouvrez **Comparaison** pour voir les 20 tâches. Le pourcentage de chaque
   outil est la moyenne de ses cinq notes lors de sa dernière tentative évaluée.
   Le meilleur outil apparaît seulement quand les trois ont des résultats.
   **Imprimer en A4** prépare le tableau pour l'impression.

Le code collé sera exécuté sur votre machine : relisez-le avant de lancer les
tests. Les soumissions actives sont stockées dans `tasks/Txx/submissions/`;
chaque réponse de chaque tentative est aussi archivée avec son prompt et ses
résultats sous `results/<outil>/Txx/`. L'application interdit une quatrième
tentative ou une nouvelle tentative après réussite.

## Tests

```sh
npm test
npm run test:T01
npm run test:T02
```

`npm run test:T01` demande quel outil tester puis exécute les tests sur sa
soumission enregistrée. L'interface est le parcours recommandé pour consigner
chaque essai, son prompt, sa réponse, ses notes et son résultat. Sans soumission,
le script l'indique au lieu d'afficher un faux résultat réussi.

Pour lancer la série des 20 tâches pour l'outil attribué dans le conteneur :

```sh
docker compose build p27-tests
docker compose run --rm -e P27_TOOL=cursor p27-tests npm run test:all
```

Remplacez `cursor` par `copilot` ou `cline-qwen2.5-coder-7b` selon votre outil.
Les tâches sans code sont indiquées comme non testées, jamais comme réussies.

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
- `scripts/benchmark.js` : suivi des essais, prompts et réponses archivés.
- `scripts/server.js` et `scripts/public/` : interface web et API locales.
- `docs/protocole-benchmark.md` et `docs/grille-evaluation.md` : consignes communes.
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
`npm ci`, puis exécute `npm test` à chaque push et pull request. Le badge
ci-dessus suit le statut du workflow du dépôt.

## Contribution

La Personne A maintient le dépôt, les exercices, l'interface et l'infrastructure
technique. Les Personnes B et C contribuent selon la répartition du projet.
Utilisez une branche et une pull request; ne commitez jamais de mot de passe,
jeton ou clé API. Inscrivez uniquement les mesures réellement observées dans
le tableau commun.
