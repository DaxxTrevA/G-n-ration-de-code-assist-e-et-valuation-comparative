const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T15 - paginate', () => {
  test('returns the requested page and pagination metadata', () => {
    expect(submission.paginate(['a', 'b', 'c', 'd', 'e'], 2, 2)).toEqual({
      items: ['c', 'd'],
      total: 5,
      page: 2,
      pageSize: 2,
      totalPages: 3
    });
  });

  test('handles an empty list and a final partial page', () => {
    expect(submission.paginate([], 1, 3)).toEqual({
      items: [], total: 0, page: 1, pageSize: 3, totalPages: 0
    });
    expect(submission.paginate([1, 2, 3], 2, 2).items).toEqual([3]);
  });

  test('rejects invalid page numbers and sizes', () => {
    expect(() => submission.paginate([1], 0, 1)).toThrow(RangeError);
    expect(() => submission.paginate([1], 1, 0)).toThrow(RangeError);
  });
});
