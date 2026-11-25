# T14 - Calculer le total d'un panier

Implémentez `calculateCartTotal(items, taxRate)` dans `submissions/<outil>.js`.
Chaque article contient un prix numérique et une quantité entière. Calculez la
somme des prix multipliés par les quantités, appliquez le taux de taxe
(`0.2` signifie 20 %), puis arrondissez le total final à deux décimales. Un
panier vide vaut zéro.

Exemple : `calculateCartTotal([{ price: 10, quantity: 2 }], 0.2)` renvoie `24`.

Exportez la fonction avec `module.exports = { calculateCartTotal }`.
