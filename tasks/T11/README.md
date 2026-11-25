# T11 - Construire une réponse JSON HTTP

Implémentez `createJsonResponse(statusCode, data)` dans
`submissions/<outil>.js`. Retournez un objet contenant le code HTTP, l'en-tête
`Content-Type: application/json; charset=utf-8` et le corps encodé avec
`JSON.stringify(data)`. Le corps est une chaîne. La fonction ne démarre pas de
serveur réseau.

Exportez la fonction avec `module.exports = { createJsonResponse }`.
