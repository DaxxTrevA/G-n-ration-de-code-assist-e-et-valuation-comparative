function flattenArray(values) {
  const result = [];
  for (const v of values) {
    if (Array.isArray(v)) result.push(...flattenArray(v));
    else result.push(v);
  }
  return result;
}

module.exports = { flattenArray };