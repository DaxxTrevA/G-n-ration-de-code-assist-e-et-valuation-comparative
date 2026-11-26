function findMissingNumber(values) {
  const n = values.length;
  let missing = (n * (n + 1)) / 2;
  for (const v of values) missing -= v;
  return missing;
}

module.exports = { findMissingNumber };