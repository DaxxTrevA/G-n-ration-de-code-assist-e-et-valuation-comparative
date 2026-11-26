function calculateCartTotal(items, taxRate) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const total = subtotal * (1 + taxRate);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

module.exports = { calculateCartTotal };