const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { TASK_PATTERN, TOOLS } = require('./benchmark-config');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'results', 'results.csv');
const TOOL_NAMES = Object.keys(TOOLS);
const CSV_HEADER = [
  'Tâche',
  'Outil',
  'Modèle / version',
  'Essai',
  'Tests réussis',
  'Total des tests',
  'Justesse /5',
  'Qualité /5',
  'Sécurité /5',
  'Temps et itérations /5',
  'Hallucinations /5',
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
  if (tool && !TOOLS[tool]) {
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
    throw Object.assign(new Error('Jest est introuvable. Depuis la racine du dépôt, lancez npm ci puis redémarrez npm start.'), {
      statusCode: 503
    });
  }

  const env = { ...process.env };
  if (tool) {
    env.P27_TOOL = TOOLS[tool].file;
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
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    submissionExists: tool
      ? fs.existsSync(path.join(taskDirectory, 'submissions', `${TOOLS[tool].file}.js`))
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

async function collectEvaluation(rl, tool, selectedModelVersion = TOOLS[tool].defaultModel) {
  const modelVersion = selectedModelVersion || await promptUntilValid(
    rl,
    'Nom exact du modèle Copilot',
    (value) => value.length > 0,
    'Saisissez le modèle affiché dans Copilot.'
  );
  const correctness = await promptScore(rl, 'Justesse');
  const quality = await promptScore(rl, 'Qualité');
  const security = await promptScore(rl, 'Sécurité');
  const timeIterations = await promptScore(rl, 'Temps et itérations');
  const hallucinations = await promptScore(rl, 'Hallucinations');
  const minutes = await promptUntilValid(
    rl,
    'Temps écoulé en minutes',
    (value) => /^\d+(?:[.,]\d+)?$/.test(value),
    'Saisissez un nombre positif ou nul.'
  );
  const remarks = await promptUntilValid(
    rl,
    'Justification factuelle',
    (value) => value.trim().length > 0,
    'Indiquez au moins une observation factuelle.'
  );
  return {
    tool,
    modelVersion,
    correctness,
    quality,
    security,
    timeIterations,
    hallucinations,
    minutes: Number(minutes.replace(',', '.')),
    remarks: remarks.trim()
  };
}

async function promptScore(rl, criterion) {
  return Number(await promptUntilValid(
    rl,
    `${criterion} (/5)`,
    (value) => /^[0-5]$/.test(value),
    'Saisissez une note entière comprise entre 0 et 5 selon la grille.'
  ));
}

function appendResult(task, testSummary, evaluation, csvPath = CSV_PATH) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const hasContent = fs.existsSync(csvPath) && fs.statSync(csvPath).size > 0;
  const header = `\uFEFF${formatCsvRow(CSV_HEADER)}\r\n`;
  const row = formatCsvRow([
    task,
    evaluation.tool,
    evaluation.modelVersion,
    testSummary.attemptNumber,
    `${testSummary.passedTests}/${testSummary.totalTests}`,
    testSummary.totalTests,
    evaluation.correctness,
    evaluation.quality,
    evaluation.security,
    evaluation.timeIterations,
    evaluation.hallucinations,
    evaluation.minutes,
    evaluation.remarks
  ]);
  if (!hasContent) {
    fs.writeFileSync(csvPath, header, { encoding: 'utf8' });
  } else if (!fs.readFileSync(csvPath, 'utf8').startsWith('\uFEFF')) {
    const existingContent = fs.readFileSync(csvPath, 'utf8');
    fs.writeFileSync(csvPath, `\uFEFF${existingContent}`, { encoding: 'utf8' });
  }
  fs.appendFileSync(csvPath, `${row}\r\n`, { encoding: 'utf8' });
}

function removeResults(task, tool, csvPath = CSV_PATH) {
  if (!TASK_PATTERN.test(task || '') || !TOOLS[tool]) {
    throw new Error('Tâche ou outil inconnu.');
  }
  if (!fs.existsSync(csvPath)) {
    return 0;
  }

  const rows = readResults(csvPath);
  const remaining = rows.filter((row) => row.task !== task || row.tool !== tool);
  const removedCount = rows.length - remaining.length;
  if (removedCount === 0) {
    return 0;
  }

  const values = (row) => [
    row.task,
    row.tool,
    row.modelVersion,
    row.attemptNumber,
    row.passedTests,
    row.totalTests,
    row.correctness,
    row.quality,
    row.security,
    row.timeIterations,
    row.hallucinations,
    row.minutes,
    row.remarks
  ];
  const content = `\uFEFF${formatCsvRow(CSV_HEADER)}\r\n${
    remaining.map((row) => formatCsvRow(values(row))).join('\r\n')
  }${remaining.length ? '\r\n' : ''}`;
  fs.writeFileSync(csvPath, content, { encoding: 'utf8' });
  return removedCount;
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

  const [headerRow, ...dataRows] = rows;
  const column = Object.fromEntries(headerRow.map((name, index) => [name, index]));
  return dataRows.map((values) => ({
    task: values[column['Tâche']] || '',
    tool: values[column.Outil] || '',
    modelVersion: values[column['Modèle / version']] || '',
    attemptNumber: values[column.Essai] || '',
    passedTests: values[column['Tests réussis']] || '',
    totalTests: values[column['Total des tests']] || '',
    correctness: values[column['Justesse /5']] || '',
    quality: values[column['Qualité /5']] || '',
    security: values[column['Sécurité /5']] || '',
    timeIterations: values[column['Temps et itérations /5']] || '',
    hallucinations: values[column['Hallucinations /5']] || '',
    minutes: values[column['Temps en minutes']] || '',
    remarks: values[column.Remarques] || ''
  }));
}

async function main() {
  const task = process.argv[2];
  if (!TASK_PATTERN.test(task || '')) {
    throw new Error('Usage : npm run evaluate -- T01 (tâche comprise entre T01 et T20).');
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const tool = await promptUntilValid(
      rl,
      `Outil (${TOOL_NAMES.join(' / ')})`,
      (value) => TOOL_NAMES.includes(value),
      `Choisissez l’un de ces outils : ${TOOL_NAMES.join(', ')}.`
    );
    const benchmark = require('./benchmark');
    const context = benchmark.getAttemptContext(ROOT, task, tool);
    if (context.isComplete || !context.nextPrompt) {
      throw new Error('Cette tâche est terminée pour cet outil : aucun autre essai autorisé.');
    }
    stdout.write(`Prompt exact à donner à l’assistant (essai ${context.nextAttempt}) :\n`);
    stdout.write(`${context.nextPrompt}\n\n`);
    const submissionPath = path.join(ROOT, 'tasks', task, 'submissions', `${TOOLS[tool].file}.js`);
    if (!fs.existsSync(submissionPath)) {
      throw new Error(`Soumission absente : ${path.relative(ROOT, submissionPath)}. Enregistrez le code brut avant l’évaluation.`);
    }
    const modelVersion = TOOLS[tool].defaultModel || await promptUntilValid(
      rl,
      'Nom exact du modèle Copilot',
      (value) => value.length > 0,
      'Saisissez le modèle affiché dans Copilot.'
    );
    const result = benchmark.runAndRecordAttempt({
      root: ROOT,
      task,
      tool,
      code: fs.readFileSync(submissionPath, 'utf8'),
      modelVersion
    });
    const attempt = result.attempt;
    stdout.write(
      `Essai ${attempt.attemptNumber} : ${attempt.testSummary.passed}/${attempt.testSummary.total} test(s), ` +
      `${attempt.testSummary.failed} échoué(s), ${attempt.testSummary.skipped} ignoré(s).\n`
    );
    if (result.exitCode !== 0) {
      stdout.write(`${attempt.retryPrompt}\n`);
    }
    const evaluation = await collectEvaluation(rl, tool, modelVersion);
    benchmark.recordAttemptEvaluation({
      root: ROOT,
      task,
      tool,
      attemptNumber: attempt.attemptNumber,
      evaluation
    });
    stdout.write(`Tentative enregistrée dans results/${TOOLS[tool].directory}/${task}/ et results/results.csv.\n`);
    if (result.exitCode !== 0) {
      process.exitCode = result.exitCode;
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
  removeResults,
  readResults,
  runTaskTests
};
