const fs = require('node:fs');
const path = require('node:path');
const { runTaskTests } = require('./evaluate');
const { TOOLS } = require('./benchmark-config');

const ROOT = path.join(__dirname, '..');
const taskIds = Array.from({ length: 20 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`);

function main() {
  const tool = Object.entries(TOOLS).find(([, config]) => config.file === process.env.P27_TOOL);
  if (!tool) {
    console.error(
      'Choisissez un outil avec P27_TOOL : cursor, copilot ou cline-qwen2.5-coder-7b.'
    );
    process.exitCode = 2;
    return;
  }

  const [toolName] = tool;
  let tested = 0;
  let missing = 0;
  let failed = 0;

  for (const task of taskIds) {
    const submission = path.join(ROOT, 'tasks', task, 'submissions', `${tool[1].file}.js`);
    if (!fs.existsSync(submission)) {
      stdoutLine(`${task} · ${toolName} · NON TESTÉ (soumission absente)`);
      missing += 1;
      continue;
    }

    const result = runTaskTests(task, toolName);
    const report = result.report;
    tested += 1;
    const passed = result.exitCode === 0 &&
      report.numPassedTests === report.numTotalTests &&
      report.numFailedTests === 0 &&
      report.numPendingTests === 0;
    stdoutLine(
      `${task} · ${toolName} · ${report.numPassedTests}/${report.numTotalTests} tests ` +
      `${passed ? 'RÉUSSIS' : 'ÉCHEC'}`
    );
    if (!passed) failed += 1;
  }

  stdoutLine(`Bilan : ${tested} tâche(s) testée(s), ${failed} échec(s), ${missing} non testée(s).`);
  if (failed > 0) {
    process.exitCode = 1;
  } else if (missing > 0) {
    process.exitCode = 2;
  }
}

function stdoutLine(message) {
  process.stdout.write(`${message}\n`);
}

main();
