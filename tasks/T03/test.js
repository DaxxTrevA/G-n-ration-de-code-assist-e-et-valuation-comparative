const { loadSubmission } = require('../../tests/load-submission');

const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T03 - sumArray', () => {
  test('adds positive and negative numbers', () => {
    expect(submission.sumArray([2, 3, 5])).toBe(10);
    expect(submission.sumArray([-4, 7, -1])).toBe(2);
  });

  test('returns zero for an empty array', () => {
    expect(submission.sumArray([])).toBe(0);
  });

  test('does not mutate the input array', () => {
    const numbers = [1, 2, 3];
    submission.sumArray(numbers);
    expect(numbers).toEqual([1, 2, 3]);
  });
});
