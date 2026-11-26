function isPalindrome(text) {
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const reversed = [...normalized].reverse().join('');
  return normalized === reversed;
}

module.exports = { isPalindrome };
