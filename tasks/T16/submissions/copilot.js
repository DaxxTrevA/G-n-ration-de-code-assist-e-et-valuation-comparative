function passwordStrength(password) {
  let score = Number(password.length >= 8) + Number(password.length >= 12);

  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return Math.min(score, 5);
}

module.exports = { passwordStrength };
