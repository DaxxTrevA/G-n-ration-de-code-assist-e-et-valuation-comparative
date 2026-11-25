const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T09 - flattenArray', () => {
  test('flattens arrays nested at several levels', () => {
    expect(submission.flattenArray([1, [2, [3]], 4])).toEqual([1, 2, 3, 4]);
  });

  test('handles empty and already flat arrays', () => {
    expect(submission.flattenArray([])).toEqual([]);
    expect(submission.flattenArray([1, 2])).toEqual([1, 2]);
  });

  test('does not mutate the input', () => {
    const values = [1, [2, 3]];
    submission.flattenArray(values);
    expect(values).toEqual([1, [2, 3]]);
  });
});
