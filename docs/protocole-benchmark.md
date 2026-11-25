# Protocole de test P27

Ce protocole reprend [Protocole_P27.docx](./Protocole_P27.docx) et la
répartition confirmée par l'équipe. Il vise à faire varier l'outil évalué,
pas les consignes ou l'aide apportée par la personne.

## Répartition et versions

| Personne | Outil et modèle |
| --- | --- |
| A | Cursor avec Grok 4.7 |
| B | GitHub Copilot; noter le nom exact du modèle affiché |
| C | Cline avec Qwen2.5-Coder 7B dans Ollama |

Noter également la version du client et du modèle avant les essais et ne pas
les modifier pendant le benchmark. Les versions et modèles sont enregistrés
avec chaque tentative.

## Même exercice, même prompt

1. Chaque personne teste les mêmes tâches T01 à T20.
2. À la première tentative, envoyer à l'outil le contenu de l'énoncé tel quel,
   sans le reformuler ni ajouter d'explication.
3. Coller et exécuter le code exactement comme l'assistant l'a rendu. Ne pas le
   corriger à la main et ne pas demander d'aide à une autre personne ou à un
   autre assistant.
4. Si les tests échouent, les tentatives 2 et 3 sont autorisées. Pour chacune,
   envoyer uniquement le message d'erreur exact affiché par les tests, sans
   ajouter de consigne.
5. Arrêter dès que tous les tests passent. Sinon, s'arrêter après trois
   tentatives au maximum.

Dans l'interface, le prompt de l'essai suivant est affiché et peut être copié.
Chaque essai archivé conserve le prompt envoyé, la réponse brute, le modèle,
les résultats des tests et, après notation, l'évaluation humaine dans
`results/<outil>/<tâche>/`.

## Résultat des tests

| Résultat final | Définition |
| --- | --- |
| Réussi | Tous les tests passent |
| Partiel | Après trois essais, au moins la moitié des tests passent |
| Échec | Après trois essais, moins de la moitié passe, ou le code ne s'exécute pas |

Les tests automatiques déterminent la justesse. L'exécution et le nombre de
tests réussis sont consignés à chaque tentative.

Pour lancer la suite des 20 exercices dans le conteneur commun, sélectionner
l'outil attribué :

```sh
docker compose build p27-tests
docker compose run --rm -e P27_TOOL=cursor p27-tests npm run test:all
```

Utiliser `P27_TOOL=copilot` pour GitHub Copilot et
`P27_TOOL=cline-qwen2.5-coder-7b` pour Cline/Qwen. Une soumission absente est
affichée comme « non testée » et ne peut pas être confondue avec un succès.

## Temps et relevé

Le temps se mesure du premier envoi de l'énoncé au dernier lancement des tests.
Après chaque tentative, enregistrer son numéro, les tests réussis, les cinq
notes de la grille, le temps écoulé et une justification factuelle.

Ne jamais inclure de secret ou de donnée personnelle dans le code, les prompts
ou le dépôt.
