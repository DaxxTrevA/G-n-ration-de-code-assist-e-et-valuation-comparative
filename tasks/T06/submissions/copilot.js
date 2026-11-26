function reverseWords(text) {
  return text.trim().split(/\s+/).reverse().join(' ');
}

module.exports = { reverseWords };
