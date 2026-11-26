function buildUserQuery(filters) {
  const allowed = ["name", "role", "active"];
  const clauses = [];
  const params = [];
  const source = filters && typeof filters === "object" ? filters : {};

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      params.push(source[key]);
      clauses.push(`${key} = $${params.length}`);
    }
  }

  const sql =
    clauses.length === 0
      ? "SELECT * FROM users"
      : `SELECT * FROM users WHERE ${clauses.join(" AND ")}`;

  return { sql, params };
}

module.exports = { buildUserQuery };