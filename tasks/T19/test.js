const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T19 - sortByField', () => {
  test('sorts numeric and string fields in ascending order', () => {
    expect(submission.sortByField([{ n: 9 }, { n: 2 }, { n: 4 }], 'n'))
      .toEqual([{ n: 2 }, { n: 4 }, { n: 9 }]);
    expect(submission.sortByField([{ name: 'Zoé' }, { name: 'Ada' }], 'name')
      .map((item) => item.name)).toEqual(['Ada', 'Zoé']);
  });

  test('preserves the original order of equal values', () => {
    const first = { score: 2, id: 'first' };
    const second = { score: 2, id: 'second' };
    expect(submission.sortByField([first, second], 'score')).toEqual([first, second]);
  });

  test('does not mutate the input', () => {
    const items = [{ n: 2 }, { n: 1 }];
    submission.sortByField(items, 'n');
    expect(items).toEqual([{ n: 2 }, { n: 1 }]);
  });
});
