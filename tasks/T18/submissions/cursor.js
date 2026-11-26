async function retryAsync(operation, maxAttempts) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }

  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { retryAsync };