const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T06 - reverseWords', () => {
  test('reverses words and normalizes whitespace', () => {
    expect(submission.reverseWords('  bonjour   tout le monde ')).toBe('monde le tout bonjour');
  });

  test('handles a single word and an empty string', () => {
    expect(submission.reverseWords('seul')).toBe('seul');
    expect(submission.reverseWords('')).toBe('');
  });

  test('returns an empty string for whitespace-only input', () => {
    expect(submission.reverseWords('   \t ')).toBe('');
  });
});
