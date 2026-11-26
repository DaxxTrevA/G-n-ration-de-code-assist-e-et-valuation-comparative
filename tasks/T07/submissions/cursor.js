function countOccurrences(values, target) {
  let count = 0;
  for (const v of values) {
    if (v === target) count++;
  }
  return count;
}

module.exports = { countOccurrences };