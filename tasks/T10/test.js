const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T10 - chunkArray', () => {
  test('splits into consecutive chunks, including a partial final chunk', () => {
    expect(submission.chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('handles an empty array and a chunk larger than the input', () => {
    expect(submission.chunkArray([], 2)).toEqual([]);
    expect(submission.chunkArray([1, 2], 5)).toEqual([[1, 2]]);
  });

  test('rejects a non-positive or non-integer chunk size', () => {
    expect(() => submission.chunkArray([1], 0)).toThrow(RangeError);
    expect(() => submission.chunkArray([1], 1.5)).toThrow(RangeError);
  });
});
