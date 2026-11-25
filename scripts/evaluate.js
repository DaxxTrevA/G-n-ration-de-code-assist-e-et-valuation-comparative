const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'results', 'results.csv');
const TASK_PATTERN = /^T(?:0[1-9]|1[0-9]|20)$/;
const TOOLS = ['GitHub Copilot', 'Cursor', 'Qwen Coder (Ollama)'];
const TOOL_FILES = {
  'GitHub Copilot': 'copilot',
  Cursor: 'cursor',
  'Qwen Coder (Ollama)': 'qwen'
};
const CSV_HEADER = [
  'Tâche',
  'Outil',
  'Tests réussis',
  'Qualité /5',
  'Sécurité /5',
  "Nombre d'essais",
  'Temps en minutes',
  'Remarques'
];

function escapeCsvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCsvRow(values) {
  return values.map(escapeCsvCell).join(';');
}

function runTaskTests(task, tool) {
  if (!TASK_PATTERN.test(task)) {
    throw new Error('La tâche doit être comprise entre T01 et T20.');
  }
  if (tool && !TOOL_FILES[tool]) {
    throw new Error(`Outil inconnu : ${tool}`);
  }

  const taskDirectory = path.join(ROOT, 'tasks', task);
  const testFile = path.join(taskDirectory, 'test.js');
  if (!fs.existsSync(testFile)) {
    throw new Error(`Le fichier de tests est introuvable : ${testFile}`);
  }

  const reportPath = path.join(os.tmpdir(), `p27-jest-${process.pid}-${Date.now()}.json`);
  const jestPath = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
  if (!fs.existsSync(jestPath)) {
    throw new Error('Jest est introuvable. Lancez d’abord npm ci.');
  }

  const env = { ...process.env };
  if (tool) {
    env.P27_TOOL = TOOL_FILES[tool];
  } else {
    delete env.P27_TOOL;
  }
  const result = spawnSync(
    process.execPath,
    [
      jestPath,
      path.relative(ROOT, testFile).split(path.sep).join('/'),
      '--runInBand',
      '--json',
      `--outputFile=${reportPath}`
    ],
    { cwd: ROOT, encoding: 'utf8', env }
  );
  if (result.stdout) {
    stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw new Error(`Impossible de lancer Jest : ${result.error.message}`);
  }

  let report;
  try {
    if (!fs.existsSync(reportPath)) {
      throw new Error('Jest n’a pas produit son rapport JSON.');
    }
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } finally {
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }
  }

  return {
    report,
    exitCode: result.status ?? 1,
    submissionExists: tool
      ? fs.existsSync(path.join(taskDirectory, 'submissions', `${TOOL_FILES[tool]}.js`))
      : fs.existsSync(path.join(taskDirectory, 'submission.js'))
  };
}

async function promptUntilValid(rl, label, validate, errorMessage) {
  while (true) {
    const value = (await rl.question(`${label} : `)).trim();
    if (validate(value)) {
      return value;
    }
    stdout.write(`${errorMessage}\n`);
  }
}

async function promptForTool(rl) {
  return promptUntilValid(
    rl,
    `Outil (${TOOLS.join(' / ')})`,
    (value) => TOOLS.includes(value),
    `Choisissez l’un de ces outils : ${TOOLS.join(', ')}.`
  );
}

async function collectEvaluation(rl, tool) {
  const quality = await promptUntilValid(
    rl,
    'Qualité (/5)',
    (value) => /^\d(?:[.,]\d+)?$/.test(value) && Number(value.replace(',', '.')) <= 5,
    'Saisissez une note entre 0 et 5.'
  );
  const security = await promptUntilValid(
    rl,
    'Sécurité (/5)',
    (value) => /^\d(?:[.,]\d+)?$/.test(value) && Number(value.replace(',', '.')) <= 5,
    'Saisissez une note entre 0 et 5.'
  );
  const trials = await promptUntilValid(
    rl,
    "Nombre d'essais",
    (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 3,
    'Saisissez un entier compris entre 1 et 3 selon le protocole.'
  );
  const minutes = await promptUntilValid(
    rl,
    'Temps en minutes',
    (value) => /^\d+(?:[.,]\d+)?$/.test(value),
    'Saisissez un nombre positif ou nul.'
  );
  const remarks = await rl.question('Remarques (Entrée pour aucune) : ');
  return {
    tool,
    quality: quality.replace(',', '.'),
    security: security.replace(',', '.'),
    trials,
    minutes: minutes.replace(',', '.'),
    remarks: remarks.trim()
  };
}

function appendResult(task, testSummary, evaluation, csvPath = CSV_PATH) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const hasContent = fs.existsSync(csvPath) && fs.statSync(csvPath).size > 0;
  const header = `\uFEFF${formatCsvRow(CSV_HEADER)}\r\n`;
  const notes = [evaluation.remarks];
  if (testSummary.skippedSuites > 0) {
    notes.push(`Suites ignorées : ${testSummary.skippedSuites}`);
  }
  if (!testSummary.submissionExists) {
    notes.push('Soumission absente : aucun test de l’exercice exécuté');
  }
  const row = formatCsvRow([
    task,
    evaluation.tool,
    testSummary.passedTests,
    evaluation.quality,
    evaluation.security,
    evaluation.trials,
    evaluation.minutes,
    notes.filter(Boolean).join(' | ')
  ]);
  if (!hasContent) {
    fs.writeFileSync(csvPath, header, { encoding: 'utf8' });
  } else if (!fs.readFileSync(csvPath, 'utf8').startsWith('\uFEFF')) {
    const existingContent = fs.readFileSync(csvPath, 'utf8');
    fs.writeFileSync(csvPath, `\uFEFF${existingContent}`, { encoding: 'utf8' });
  }
  fs.appendFileSync(csvPath, `${row}\r\n`, { encoding: 'utf8' });
}

function readResults(csvPath = CSV_PATH) {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ';') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (rows.length > 0 || row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows.slice(1).map((values) => ({
    task: values[0] || '',
    tool: values[1] || '',
    passedTests: values[2] || '',
    quality: values[3] || '',
    security: values[4] || '',
    trials: values[5] || '',
    minutes: values[6] || '',
    remarks: values[7] || ''
  }));
}

async function main() {
  const task = process.argv[2];
  if (!TASK_PATTERN.test(task || '')) {
    throw new Error('Usage : npm run evaluate -- T01 (tâche comprise entre T01 et T20).');
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const tool = await promptForTool(rl);
    const { report, exitCode, submissionExists } = runTaskTests(task, tool);
    const summary = {
      passedTests: report.numPassedTests,
      failedTests: report.numFailedTests,
      skippedSuites: report.numPendingTestSuites,
      submissionExists
    };
    stdout.write(
      `Bilan ${task} : ${summary.passedTests} test(s) réussi(s), ` +
      `${summary.failedTests} échoué(s), ${summary.skippedSuites} suite(s) ignorée(s).\n`
    );
    const evaluation = await collectEvaluation(rl, tool);
    appendResult(task, summary, evaluation);
    stdout.write(`Évaluation ajoutée à ${path.relative(ROOT, CSV_PATH)}.\n`);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Erreur : ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  appendResult,
  escapeCsvCell,
  formatCsvRow,
  readResults,
  runTaskTests
};
