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

function runTaskTests(task) {
  if (!TASK_PATTERN.test(task)) {
    throw new Error('La tâche doit être comprise entre T01 et T20.');
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

  const result = spawnSync(
    process.execPath,
    [jestPath, testFile, '--runInBand', '--json', `--outputFile=${reportPath}`],
    { cwd: ROOT, stdio: 'inherit' }
  );

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
    submissionExists: fs.existsSync(path.join(taskDirectory, 'submission.js'))
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

async function collectEvaluation(rl) {
  const tool = await promptUntilValid(
    rl,
    `Outil (${TOOLS.join(' / ')})`,
    (value) => TOOLS.includes(value),
    `Choisissez l’un de ces outils : ${TOOLS.join(', ')}.`
  );
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
    (value) => /^\d+$/.test(value) && Number(value) >= 1,
    'Saisissez un entier supérieur ou égal à 1.'
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

async function main() {
  const task = process.argv[2];
  if (!TASK_PATTERN.test(task || '')) {
    throw new Error('Usage : npm run evaluate -- T01 (tâche comprise entre T01 et T20).');
  }

  const { report, exitCode, submissionExists } = runTaskTests(task);
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

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const evaluation = await collectEvaluation(rl);
    appendResult(task, summary, evaluation);
    stdout.write(`Évaluation ajoutée à ${path.relative(ROOT, CSV_PATH)}.\n`);
  } finally {
    rl.close();
  }

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Erreur : ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { appendResult, escapeCsvCell, formatCsvRow, runTaskTests };
