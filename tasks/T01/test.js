const { loadSubmission } = require('../../tests/load-submission');

const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T01 - capitalize', () => {
  test('capitalizes the first character and preserves the rest', () => {
    expect(submission.capitalize('bonjour')).toBe('Bonjour');
    expect(submission.capitalize('hELLO')).toBe('HELLO');
  });

  test('supports an empty string', () => {
    expect(submission.capitalize('')).toBe('');
  });

  test('does not change a string that starts with a digit', () => {
    expect(submission.capitalize('7 jours')).toBe('7 jours');
  });
});
