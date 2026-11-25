# T15 - Paginer une liste

Implémentez `paginate(items, page, pageSize)` dans `submissions/<outil>.js`.
Les pages commencent à 1. Retournez `{ items, total, page, pageSize,
totalPages }`, où `items` contient uniquement la page demandée et
`totalPages` vaut zéro pour une liste vide. `page` et `pageSize` doivent être
des entiers positifs, sinon lancez une `RangeError`. Ne modifiez pas la liste.

Exportez la fonction avec `module.exports = { paginate }`.
