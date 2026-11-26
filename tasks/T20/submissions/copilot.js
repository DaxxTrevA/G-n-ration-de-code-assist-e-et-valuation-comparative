function parseCsvLine(line) {
  const fields = [];
  let index = 0;

  while (index <= line.length) {
    let field = '';

    if (line[index] === '"') {
      index++;
      let closed = false;

      while (index < line.length) {
        if (line[index] === '"') {
          if (line[index + 1] === '"') {
            field += '"';
            index += 2;
          } else {
            closed = true;
            index++;
            break;
          }
        } else {
          field += line[index];
          index++;
        }
      }

      if (!closed) {
        throw new SyntaxError('Unclosed quoted field');
      }
      if (index < line.length && line[index] !== ';') {
        throw new SyntaxError('Unexpected character after quoted field');
      }
    } else {
      while (index < line.length && line[index] !== ';') {
        field += line[index];
        index++;
      }
    }

    fields.push(field);
    if (index === line.length) {
      break;
    }
    index++;
  }

  return fields;
}

module.exports = { parseCsvLine };
