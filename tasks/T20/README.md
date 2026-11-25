# T20 - Analyser une ligne CSV simple

Implémentez `parseCsvLine(line)` dans `submissions/<outil>.js`. Analysez une
ligne de CSV dont le séparateur est `;`. Un champ peut être entouré de guillemets
et contenir des séparateurs ou des guillemets doublés (`""`). Une ligne vide
correspond à un champ vide. Une ligne avec un guillemet non fermé lève une
`SyntaxError`. Les retours à la ligne ne sont pas inclus dans une ligne.

Exemple : `parseCsvLine('T01;"Copilot; agent";"a ""quote"" "')` renvoie
`['T01', 'Copilot; agent', 'a "quote" ']`.

Exportez la fonction avec `module.exports = { parseCsvLine }`.
