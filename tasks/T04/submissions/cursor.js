function countVowels(text) {
  const matches = String(text).match(/[aeiou]/gi);
  return matches ? matches.length : 0;
}

module.exports = { countVowels };