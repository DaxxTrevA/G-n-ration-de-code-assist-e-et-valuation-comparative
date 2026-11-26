function countOccurrences(values, target) {
  return values.reduce((count, value) => count + (value === target ? 1 : 0), 0);
}

module.exports = { countOccurrences };
