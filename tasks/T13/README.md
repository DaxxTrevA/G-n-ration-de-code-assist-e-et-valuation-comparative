# T13 - Échapper du texte pour du HTML

Implémentez `escapeHtml(text)` dans `submissions/<outil>.js`. Remplacez les cinq
caractères `&`, `<`, `>`, `"`, `'` par `&amp;`, `&lt;`, `&gt;`, `&quot;`,
`&#39;`. Échappez l'esperluette en premier pour ne pas modifier les entités
créées. Les autres caractères restent inchangés.

Exemple : `escapeHtml("<b>")` renvoie `"&lt;b&gt;"`.

Exportez la fonction avec `module.exports = { escapeHtml }`.
