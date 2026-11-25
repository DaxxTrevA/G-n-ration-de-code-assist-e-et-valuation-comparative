# T18 - Réessayer une opération asynchrone

Implémentez `retryAsync(operation, maxAttempts)` dans `submissions/<outil>.js`.
Appelez la fonction asynchrone jusqu'à son succès ou jusqu'à
`maxAttempts` tentatives. Résolvez avec la valeur du premier succès. Si toutes
les tentatives échouent, rejetez avec la dernière erreur. `maxAttempts` doit
être un entier positif, sinon lancez une `RangeError`.

Exportez la fonction avec `module.exports = { retryAsync }`.
