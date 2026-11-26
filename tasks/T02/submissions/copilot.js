function isPalindrome(text) {
  const characters = [...text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')];
  return characters.join('') === characters.reverse().join('');
}

module.exports = { isPalindrome };
