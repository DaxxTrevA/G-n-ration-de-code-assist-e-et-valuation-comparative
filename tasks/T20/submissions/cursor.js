function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ";") {
      fields.push(current);
      current = "";
      continue;
    }

    current += c;
  }

  if (inQuotes) {
    throw new SyntaxError("Unterminated quoted field");
  }

  fields.push(current);
  return fields;
}

module.exports = { parseCsvLine };