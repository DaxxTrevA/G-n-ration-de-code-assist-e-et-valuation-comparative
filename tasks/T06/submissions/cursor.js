function reverseWords(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  return words.reverse().join(" ");
}

module.exports = { reverseWords };