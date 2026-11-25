const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T07 - countOccurrences', () => {
  test('counts strict matches', () => {
    expect(submission.countOccurrences(['a', 'b', 'a', 'A'], 'a')).toBe(2);
    expect(submission.countOccurrences([1, '1', 1], 1)).toBe(2);
  });

  test('returns zero for no matches and for an empty array', () => {
    expect(submission.countOccurrences(['x'], 'z')).toBe(0);
    expect(submission.countOccurrences([], 'x')).toBe(0);
  });

  test('does not mutate the input', () => {
    const values = [1, 2, 1];
    submission.countOccurrences(values, 1);
    expect(values).toEqual([1, 2, 1]);
  });
});
