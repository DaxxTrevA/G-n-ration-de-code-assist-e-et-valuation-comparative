const { loadSubmission } = require('../../tests/load-submission');

const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T02 - isPalindrome', () => {
  test('recognizes simple palindromes regardless of case', () => {
    expect(submission.isPalindrome('Radar')).toBe(true);
    expect(submission.isPalindrome('kayak')).toBe(true);
  });

  test('ignores spaces and punctuation', () => {
    expect(submission.isPalindrome('Esope reste ici et se repose')).toBe(true);
    expect(submission.isPalindrome('A man, a plan, a canal: Panama!')).toBe(true);
  });

  test('rejects a non-palindrome and accepts an empty string', () => {
    expect(submission.isPalindrome('bonjour')).toBe(false);
    expect(submission.isPalindrome('')).toBe(true);
    expect(submission.isPalindrome('Ée')).toBe(false);
  });
});
