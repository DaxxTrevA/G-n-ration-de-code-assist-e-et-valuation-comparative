const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T12 - buildUserQuery', () => {
  test('uses parameter placeholders in a fixed, documented order', () => {
    expect(submission.buildUserQuery({ active: true, name: 'Ada' })).toEqual({
      sql: 'SELECT * FROM users WHERE name = $1 AND active = $2',
      params: ['Ada', true]
    });
  });

  test('returns a plain select when there are no supported filters', () => {
    expect(submission.buildUserQuery({ unknown: 'value' })).toEqual({
      sql: 'SELECT * FROM users',
      params: []
    });
  });

  test('never inserts filter values into SQL, including injection-like input', () => {
    const attack = "' OR 1=1 --";
    const result = submission.buildUserQuery({ name: attack });
    expect(result.sql).toBe('SELECT * FROM users WHERE name = $1');
    expect(result.sql).not.toContain(attack);
    expect(result.params).toEqual([attack]);
  });
});
