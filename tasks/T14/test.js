const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T14 - calculateCartTotal', () => {
  test('applies quantities and tax to a cart', () => {
    expect(submission.calculateCartTotal([
      { price: 10, quantity: 2 },
      { price: 5.5, quantity: 1 }
    ], 0.2)).toBe(30.6);
  });

  test('rounds the final total to cents', () => {
    expect(submission.calculateCartTotal([{ price: 0.1, quantity: 1 }], 0.2)).toBe(0.12);
  });

  test('returns zero for an empty cart', () => {
    expect(submission.calculateCartTotal([], 0.2)).toBe(0);
  });
});
