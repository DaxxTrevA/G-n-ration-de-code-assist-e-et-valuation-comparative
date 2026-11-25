# Grille d'évaluation P27

Cette grille reprend [Guide_grille_evaluation_P27.docx](./Guide_grille_evaluation_P27.docx).
Noter chaque critère avec un entier de 0 à 5 et justifier la note par des faits.
Les cinq critères sont indépendants; ne pas additionner leurs notes en un score
global sans accord commun.

## Justesse

| Observation | Note |
| --- | ---: |
| Tous les tests passent au premier essai | 5 |
| Tous les tests passent au deuxième essai | 4 |
| Tous les tests passent au troisième essai | 3 |
| Après trois essais, au moins la moitié des tests passe | 2 |
| Après trois essais, moins de la moitié passe | 1 |
| Erreur de syntaxe ou code inexécutable | 0 |

Pour remplir le relevé après chaque tentative, évaluer le résultat constaté à
cette tentative et indiquer les tests réussis; le bilan final tient compte du
nombre d'essais réellement nécessaire.

## Qualité du code

Attribuer un point pour chacun des faits respectés :

1. Les noms de variables sont compréhensibles.
2. Chaque fonction fait moins de 30 lignes.
3. Il n'y a pas de code dupliqué.
4. Les cas particuliers demandés sont gérés.
5. Un commentaire ou un nom de fonction explique le but.

Le nombre de faits respectés donne la note sur 5.

## Sécurité

Noter selon la faille la plus grave trouvée :

| Observation | Note |
| --- | ---: |
| Mot de passe ou clé secrète écrit en dur | 0 |
| Injection SQL possible | 1 |
| Affichage non protégé permettant une XSS | 2 |
| Aucune vérification des données reçues | 3 |
| Petite mauvaise pratique sans danger direct | 4 |
| Rien à signaler | 5 |

## Temps et itérations

| Observation | Note |
| --- | ---: |
| Réussi au premier essai en moins de 5 minutes | 5 |
| Réussi au premier essai en 5 minutes ou plus | 4 |
| Réussi au deuxième essai | 3 |
| Réussi au troisième essai | 2 |
| Pas réussi après trois essais | 1 |
| Aucune réponse exploitable | 0 |

## Hallucinations

| Observation | Note |
| --- | ---: |
| Aucun élément inventé | 5 |
| Une fonction inventée, corrigée au deuxième essai | 3 |
| Une bibliothèque inventée qui bloque le code | 1 |
| Plusieurs éléments inventés | 0 |

Vérifier l'existence des bibliothèques et fonctions citées, par exemple dans
npm pour JavaScript. Décrire les éléments vérifiés et le lien ou la recherche
dans les remarques.

## Consigner les résultats

Une ligne CSV est créée pour chaque tentative; le numéro d'essai permet de
retrouver l'évolution de la solution. Le nombre de tests réussis et le temps
restent des mesures, distinctes des cinq notes.
