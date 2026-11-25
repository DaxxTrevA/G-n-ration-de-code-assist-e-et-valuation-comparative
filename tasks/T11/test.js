const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T11 - createJsonResponse', () => {
  test('returns the status, JSON content type, and serialized body', () => {
    expect(submission.createJsonResponse(201, { id: 4, name: 'Ada' })).toEqual({
      statusCode: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: '{"id":4,"name":"Ada"}'
    });
  });

  test('serializes arrays and strings as JSON', () => {
    expect(submission.createJsonResponse(200, [1, 2]).body).toBe('[1,2]');
    expect(submission.createJsonResponse(200, 'ok').body).toBe('"ok"');
  });

  test('does not modify the supplied data', () => {
    const data = { values: [1, 2] };
    submission.createJsonResponse(200, data);
    expect(data).toEqual({ values: [1, 2] });
  });
});
