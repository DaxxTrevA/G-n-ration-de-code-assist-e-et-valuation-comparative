const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { runTaskTests } = require('./evaluate');

const ROOT = path.join(__dirname, '..');
const TASK_PATTERN = /^T(?:0[1-9]|1[0-9]|20)$/;
const TOOLS = ['GitHub Copilot', 'Cursor', 'Qwen Coder (Ollama)'];
const TOOL_FILES = {
  'GitHub Copilot': 'copilot',
  Cursor: 'cursor',
  'Qwen Coder (Ollama)': 'qwen'
};

async function main() {
  const task = process.argv[2];
  if (!TASK_PATTERN.test(task || '')) {
    throw new Error('Usage : npm run test:T01 (tâche comprise entre T01 et T20).');
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  let tool;
  try {
    tool = await rl.question(`Quel outil tester ? ${TOOLS.join(' / ')} : `);
  } finally {
    rl.close();
  }
  tool = tool.trim();
  if (!TOOL_FILES[tool]) {
    throw new Error(`Outil inconnu. Choisissez parmi : ${TOOLS.join(', ')}.`);
  }

  const submissionPath = path.join(ROOT, 'tasks', task, 'submissions', `${TOOL_FILES[tool]}.js`);
  if (!fs.existsSync(submissionPath)) {
    stdout.write(`Aucune soumission ${tool} pour ${task}.\n`);
    stdout.write('Collez d’abord le code dans l’interface avec cet outil sélectionné.\n');
    process.exitCode = 2;
    return;
  }

  const result = runTaskTests(task, tool);
  const { report } = result;
  stdout.write(
    `Bilan ${task} — ${tool} : ${report.numPassedTests} réussi(s), ` +
    `${report.numFailedTests} échoué(s), ${report.numPendingTests} ignoré(s).\n`
  );
  if (
    !result.submissionExists ||
    result.exitCode !== 0 ||
    report.numFailedTests > 0 ||
    report.numPendingTests > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Erreur : ${error.message}`);
  process.exitCode = 1;
});
