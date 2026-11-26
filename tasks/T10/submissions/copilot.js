function chunkArray(values, size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('size must be a positive integer');
  }

  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

module.exports = { chunkArray };
