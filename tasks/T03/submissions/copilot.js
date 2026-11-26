function sumArray(numbers) {
  return numbers.reduce((sum, number) => sum + number, 0);
}

module.exports = { sumArray };
