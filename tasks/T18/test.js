const { loadSubmission } = require('../../tests/load-submission');
const submission = loadSubmission(__dirname);

(submission ? describe : describe.skip)('T18 - retryAsync', () => {
  test('resolves when an attempt succeeds', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('temporaire'))
      .mockResolvedValue('ok');
    await expect(submission.retryAsync(operation, 3)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('rejects with the last error when all attempts fail', async () => {
    const lastError = new Error('dernier échec');
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('premier échec'))
      .mockRejectedValueOnce(lastError);
    await expect(submission.retryAsync(operation, 2)).rejects.toBe(lastError);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('rejects a non-positive attempt limit', async () => {
    await expect(submission.retryAsync(jest.fn(), 0)).rejects.toThrow(RangeError);
  });
});
