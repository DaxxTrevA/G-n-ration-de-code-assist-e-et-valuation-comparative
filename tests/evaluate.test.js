const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  appendResult,
  escapeCsvCell,
  formatCsvRow,
  removeResults,
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
        { passedTests: 2, totalTests: 3, attemptNumber: 2 },
        {
          tool: 'Cursor (Grok 4.7)',
          modelVersion: 'Grok 4.7',
          correctness: 2,
          quality: 4,
          security: 3,
          timeIterations: 3,
          hallucinations: 5,
          minutes: 1.5,
          remarks: 'Test; note'
        },
        csvPath
      );

      const contents = fs.readFileSync(csvPath, 'utf8');
      expect(contents.charCodeAt(0)).toBe(0xfeff);
      expect(contents).toContain(
        'T01;Cursor (Grok 4.7);Grok 4.7;2;2/3;3;2;4;3;3;5;1.5;"Test; note"'
      );
      expect(readResults(csvPath)).toEqual([{
        task: 'T01',
        tool: 'Cursor (Grok 4.7)',
        modelVersion: 'Grok 4.7',
        attemptNumber: '2',
        passedTests: '2/3',
        totalTests: '3',
        correctness: '2',
        quality: '4',
        security: '3',
        timeIterations: '3',
        hallucinations: '5',
        minutes: '1.5',
        remarks: 'Test; note'
      }]);
    } finally {
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }
    }
  });

  test('removes only the selected task and tool rows from the CSV', () => {
    const csvPath = path.join(os.tmpdir(), `p27-reset-${process.pid}-${Date.now()}.csv`);
    const append = (task, tool) => appendResult(
      task,
      { passedTests: 2, totalTests: 3, attemptNumber: 1 },
      {
        tool,
        modelVersion: 'Test model',
        correctness: 3,
        quality: 3,
        security: 3,
        timeIterations: 3,
        hallucinations: 3,
        minutes: 1,
        remarks: ''
      },
      csvPath
    );

    try {
      append('T01', 'Cursor (Grok 4.7)');
      append('T01', 'GitHub Copilot');
      append('T02', 'Cursor (Grok 4.7)');

      expect(removeResults('T01', 'Cursor (Grok 4.7)', csvPath)).toBe(1);
      expect(readResults(csvPath).map(({ task, tool }) => [task, tool])).toEqual([
        ['T01', 'GitHub Copilot'],
        ['T02', 'Cursor (Grok 4.7)']
      ]);
    } finally {
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }
    }
  });
});
