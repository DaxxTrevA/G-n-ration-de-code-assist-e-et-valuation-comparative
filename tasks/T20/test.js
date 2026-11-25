const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T20 - parseCsvLine', () => {
  test('splits simple semicolon-separated fields', () => {
    expect(submission.parseCsvLine('T01;Copilot;3')).toEqual(['T01', 'Copilot', '3']);
  });

  test('supports separators and doubled quotes inside quoted fields', () => {
    expect(submission.parseCsvLine('T01;"Copilot; agent";"a ""quote"" "'))
      .toEqual(['T01', 'Copilot; agent', 'a "quote" ']);
  });

  test('handles an empty field and rejects an unclosed quoted field', () => {
    expect(submission.parseCsvLine('a;;c')).toEqual(['a', '', 'c']);
    expect(() => submission.parseCsvLine('a;"incomplet')).toThrow(SyntaxError);
  });
});
