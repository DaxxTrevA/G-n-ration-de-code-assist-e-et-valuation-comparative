function findMissingNumber(values) {
  const n = values.length;
  const expectedSum = (n * (n + 1)) / 2;
  const actualSum = values.reduce((sum, value) => sum + value, 0);
  return expectedSum - actualSum;
}

module.exports = { findMissingNumber };
