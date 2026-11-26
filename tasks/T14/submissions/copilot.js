function calculateCartTotal(items, taxRate) {
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  return Math.round((subtotal * (1 + taxRate) + Number.EPSILON) * 100) / 100;
}

module.exports = { calculateCartTotal };
