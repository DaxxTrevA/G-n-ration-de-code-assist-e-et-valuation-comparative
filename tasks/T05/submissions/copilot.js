function fizzBuzz(n) {
  return Array.from({ length: n }, (_, index) => {
    const value = index + 1;

    if (value % 15 === 0) {
      return 'FizzBuzz';
    }
    if (value % 3 === 0) {
      return 'Fizz';
    }
    if (value % 5 === 0) {
      return 'Buzz';
    }

    return value;
  });
}

module.exports = { fizzBuzz };
