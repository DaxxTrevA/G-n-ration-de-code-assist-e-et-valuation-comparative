const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T08 - uniqueValues', () => {
  test('removes duplicates and preserves first-seen order', () => {
    expect(submission.uniqueValues([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });

  test('handles an empty array', () => {
    expect(submission.uniqueValues([])).toEqual([]);
  });

  test('does not mutate the input', () => {
    const values = ['a', 'b', 'a'];
    submission.uniqueValues(values);
    expect(values).toEqual(['a', 'b', 'a']);
  });
});
