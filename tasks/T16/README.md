# T16 - Estimer la robustesse d'un mot de passe

Implémentez `passwordStrength(password)` dans `submissions/<outil>.js`. Le
résultat est un entier de 0 à 5 : ajoutez un point pour une longueur d'au moins
8 caractères, un autre pour au moins 12 caractères, et un point pour chacune
des catégories présentes parmi minuscules, majuscules, chiffres et caractères
spéciaux. Le score est plafonné à 5. Ce score pédagogique n'est pas une
validation de sécurité ni un stockage de mot de passe.

Exportez la fonction avec `module.exports = { passwordStrength }`.
