function sortByField(items, field) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftValue = left.item[field];
      const rightValue = right.item[field];
      let comparison = 0;

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        comparison = leftValue - rightValue;
      } else if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        comparison = leftValue.localeCompare(rightValue);
      }

      return comparison || left.index - right.index;
    })
    .map(({ item }) => item);
}

module.exports = { sortByField };
