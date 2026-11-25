const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T17 - findMissingNumber', () => {
  test('finds a missing value in the middle or at the end', () => {
    expect(submission.findMissingNumber([3, 0, 1])).toBe(2);
    expect(submission.findMissingNumber([0, 1, 2])).toBe(3);
  });

  test('handles a single missing zero', () => {
    expect(submission.findMissingNumber([1])).toBe(0);
  });

  test('does not mutate the input', () => {
    const values = [3, 0, 1];
    submission.findMissingNumber(values);
    expect(values).toEqual([3, 0, 1]);
  });
});
