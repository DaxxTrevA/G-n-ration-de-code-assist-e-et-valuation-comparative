const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  appendResult,
  escapeCsvCell,
  formatCsvRow,
  readResults
} = require('../scripts/evaluate');

describe('CSV evaluation helpers', () => {
  test('quotes separators, quotes, and line breaks for Excel-compatible CSV', () => {
    expect(escapeCsvCell('avis; "utile"\nligne 2')).toBe('"avis; ""utile""\nligne 2"');
  });

  test('protects text that could be interpreted as an Excel formula', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1");
  });

  test('uses the semicolon delimiter', () => {
    expect(formatCsvRow(['T01', 'Cursor', 3])).toBe('T01;Cursor;3');
  });

  test('writes user-entered measurements and test outcomes to a UTF-8 BOM CSV', () => {
    const csvPath = path.join(os.tmpdir(), `p27-results-${process.pid}-${Date.now()}.csv`);
    try {
      appendResult(
        'T01',
        { passedTests: 2, skippedSuites: 0, submissionExists: true },
        {
          tool: 'Cursor',
          quality: '4',
          security: '3.5',
          trials: '2',
          minutes: '1.5',
          remarks: 'Test; note'
        },
        csvPath
      );

      const contents = fs.readFileSync(csvPath, 'utf8');
      expect(contents.charCodeAt(0)).toBe(0xfeff);
      expect(contents).toContain('T01;Cursor;2;4;3.5;2;1.5;"Test; note"');
      expect(readResults(csvPath)).toEqual([{
        task: 'T01',
        tool: 'Cursor',
        passedTests: '2',
        quality: '4',
        security: '3.5',
        trials: '2',
        minutes: '1.5',
        remarks: 'Test; note'
      }]);
    } finally {
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }
    }
  });
});
