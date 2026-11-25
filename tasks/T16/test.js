const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T16 - passwordStrength', () => {
  test('scores the documented length and character categories', () => {
    expect(submission.passwordStrength('abc')).toBe(1);
    expect(submission.passwordStrength('abcdefgh')).toBe(2);
    expect(submission.passwordStrength('Abcdef12!')).toBe(5);
  });

  test('caps the score at five', () => {
    expect(submission.passwordStrength('Abcdefgh123!')).toBe(5);
  });

  test('returns a numeric score for an empty string', () => {
    expect(submission.passwordStrength('')).toBe(0);
  });
});
