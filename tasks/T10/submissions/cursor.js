function chunkArray(values, size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("size must be a strictly positive integer");
  }
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

module.exports = { chunkArray };