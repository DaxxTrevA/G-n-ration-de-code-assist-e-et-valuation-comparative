const { loadSubmission } = require('../../tests/load-submission');

const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T04 - countVowels', () => {
  test('counts basic vowels in either case', () => {
    expect(submission.countVowels('Bonjour')).toBe(3);
    expect(submission.countVowels('AEIOU')).toBe(5);
  });

  test('does not count accented vowels', () => {
    expect(submission.countVowels('Été')).toBe(0);
  });

  test('returns zero when there are no vowels', () => {
    expect(submission.countVowels('rhythm')).toBe(0);
  });
});
