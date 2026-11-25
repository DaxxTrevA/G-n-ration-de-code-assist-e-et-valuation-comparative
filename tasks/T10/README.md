# T10 - Découper un tableau en lots

Implémentez `chunkArray(values, size)` dans `submissions/<outil>.js`. Retournez
un tableau de lots consécutifs de taille `size` au maximum. Le dernier lot peut
être plus petit. `size` doit être un entier strictement positif, sinon la
fonction lève une `RangeError`. Le tableau d'entrée reste inchangé.

Exemple : `chunkArray([1, 2, 3, 4, 5], 2)` renvoie
`[[1, 2], [3, 4], [5]]`.

Exportez la fonction avec `module.exports = { chunkArray }`.
