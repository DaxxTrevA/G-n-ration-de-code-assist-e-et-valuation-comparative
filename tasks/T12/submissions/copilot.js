function buildUserQuery(filters) {
  const allowedFields = ['name', 'role', 'active'];
  const conditions = [];
  const params = [];

  for (const field of allowedFields) {
    if (Object.hasOwn(filters, field)) {
      params.push(filters[field]);
      conditions.push(`${field} = $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return {
    sql: `SELECT * FROM users${whereClause}`,
    params
  };
}

module.exports = { buildUserQuery };
