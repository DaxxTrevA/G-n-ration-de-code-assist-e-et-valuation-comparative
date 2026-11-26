function passwordStrength(password) {
  const s = String(password);
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[a-z]/.test(s)) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  return Math.min(score, 5);
}

module.exports = { passwordStrength };