# T12 - Construire une requête SQL paramétrée

Implémentez `buildUserQuery(filters)` dans `submissions/<outil>.js`. Autorisez
uniquement les filtres `name`, `role` et `active`, dans cet ordre fixe. Retournez
`{ sql, params }` pour `SELECT * FROM users`, avec une clause `WHERE` utilisant
des placeholders `$1`, `$2`, etc. Les valeurs sont exclusivement dans `params`,
jamais concaténées dans la requête. Ignorez les clés inconnues.

Exemple : `{ name: "Ada", active: true }` produit `SELECT * FROM users WHERE
name = $1 AND active = $2` et `["Ada", true]`.

Exportez la fonction avec `module.exports = { buildUserQuery }`.
