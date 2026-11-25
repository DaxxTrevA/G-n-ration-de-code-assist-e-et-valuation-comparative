const { loadSubmission } = require('../../tests/load-submission');

const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T05 - fizzBuzz', () => {
  test('replaces multiples of three and five', () => {
    expect(submission.fizzBuzz(5)).toEqual([1, 2, 'Fizz', 4, 'Buzz']);
    expect(submission.fizzBuzz(15)[14]).toBe('FizzBuzz');
  });

  test('returns an empty array for zero', () => {
    expect(submission.fizzBuzz(0)).toEqual([]);
  });

  test('keeps ordinary values as numbers', () => {
    expect(submission.fizzBuzz(2)).toEqual([1, 2]);
  });
});
