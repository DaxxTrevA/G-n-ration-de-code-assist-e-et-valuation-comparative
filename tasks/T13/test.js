const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T13 - escapeHtml', () => {
  test('escapes all HTML-sensitive characters', () => {
    expect(submission.escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  test('escapes ampersands before creating entities', () => {
    expect(submission.escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  test('preserves ordinary text and accepts empty input', () => {
    expect(submission.escapeHtml('Bonjour 123')).toBe('Bonjour 123');
    expect(submission.escapeHtml('')).toBe('');
  });
});
