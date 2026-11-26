function countVowels(text) {
  const vowels = text.match(/[aeiou]/gi);
  return vowels ? vowels.length : 0;
}

module.exports = { countVowels };
