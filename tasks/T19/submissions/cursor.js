function sortByField(items, field) {
  return items.slice().sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (typeof va === "number" && typeof vb === "number") {
      return va - vb;
    }
    return String(va).localeCompare(String(vb));
  });
}

module.exports = { sortByField };