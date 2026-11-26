const fs = require('node:fs');
const path = require('node:path');
const { appendResult, removeResults, runTaskTests } = require('./evaluate');
const { MAX_ATTEMPTS, TASK_PATTERN, TOOLS } = require('./benchmark-config');

function getTaskDirectory(root, task) {
  if (!TASK_PATTERN.test(task || '')) {
    throw new Error('La tâche doit être comprise entre T01 et T20.');
  }
  return path.join(root, 'tasks', task);
}

function getAttemptDirectory(root, task, tool) {
  const toolConfig = TOOLS[tool];
  if (!toolConfig) {
    throw new Error(`Outil inconnu : ${tool}`);
  }
  return path.join(root, 'results', toolConfig.directory, task);
}

function readAttempts(root, task, tool) {
  const directory = getAttemptDirectory(root, task, tool);
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory)
    .filter((name) => /^attempt-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')));
}

function buildRetryPrompt(report, testOutput = '') {
  const failures = [];
  for (const suite of report.testResults) {
    const failedAssertions = suite.assertionResults
      .filter((assertion) => assertion.status === 'failed');
    for (const assertion of failedAssertions) {
      failures.push(`${assertion.fullName}\n${assertion.failureMessages.join('\n')}`);
    }
    if (failedAssertions.length === 0 && suite.failureMessage) {
      failures.push(suite.failureMessage);
    }
  }
  return failures.join('\n\n').trim() || testOutput.trim();
}

function summarizeTestCases(report) {
  return report.testResults.flatMap((suite) => {
    const assertions = suite.assertionResults || [];
    if (assertions.length === 0 && suite.failureMessage) {
      return [{
        name: suite.name,
        status: 'failed',
        durationMs: null,
        details: suite.failureMessage
      }];
    }

    return assertions.map((assertion) => ({
      name: assertion.fullName,
      status: assertion.status,
      durationMs: Number.isFinite(assertion.duration) ? assertion.duration : null,
      details: (assertion.failureMessages || []).join('\n')
    }));
  });
}

function getAttemptContext(root, task, tool) {
  const taskDirectory = getTaskDirectory(root, task);
  const attempts = readAttempts(root, task, tool);
  const lastAttempt = attempts.at(-1);
  const awaitingEvaluation = Boolean(lastAttempt && !lastAttempt.evaluation);
  const isComplete = Boolean(
    attempts.length >= MAX_ATTEMPTS ||
    (lastAttempt && lastAttempt.status === 'Réussi')
  );
  const nextPrompt = isComplete || awaitingEvaluation
    ? ''
    : lastAttempt
      ? lastAttempt.retryPrompt
      : fs.readFileSync(path.join(taskDirectory, 'README.md'), 'utf8');

  return {
    attempts,
    awaitingEvaluation,
    isComplete,
    nextPrompt,
    nextAttempt: isComplete || awaitingEvaluation ? null : attempts.length + 1
  };
}

function runAndRecordAttempt({ root, task, tool, code, modelVersion }) {
  const toolConfig = TOOLS[tool];
  if (!toolConfig) {
    throw new Error(`Outil inconnu : ${tool}`);
  }
  if (typeof code !== 'string' || code.length === 0 || code.length > 1024 * 1024) {
    throw new Error('La réponse doit contenir du code (maximum 1 Mo).');
  }
  if (typeof modelVersion !== 'string' || modelVersion.trim().length === 0) {
    throw new Error('Indiquez le modèle ou la version exacte utilisée.');
  }
  if (toolConfig.defaultModel && modelVersion.trim() !== toolConfig.defaultModel) {
    throw new Error(`Le modèle fixé pour cet outil est ${toolConfig.defaultModel}.`);
  }

  const context = getAttemptContext(root, task, tool);
  if (context.awaitingEvaluation) {
    throw new Error('Évaluez la tentative précédente avant de lancer un nouvel essai.');
  }
  if (context.isComplete || !context.nextPrompt) {
    throw new Error('Cette tâche est terminée pour cet outil : aucun autre essai autorisé.');
  }

  const taskDirectory = getTaskDirectory(root, task);
  const submissionPath = path.join(taskDirectory, 'submissions', `${toolConfig.file}.js`);
  fs.mkdirSync(path.dirname(submissionPath), { recursive: true });
  fs.writeFileSync(submissionPath, code, 'utf8');

  const startedAt = new Date().toISOString();
  const testResult = runTaskTests(task, tool);
  const report = testResult.report;
  const retryPrompt = buildRetryPrompt(report, testResult.output);
  const testCases = summarizeTestCases(report);
  const failures = report.testResults.flatMap((suite) => suite.assertionResults
    .filter((assertion) => assertion.status === 'failed')
    .map((assertion) => ({
      name: assertion.fullName,
      message: assertion.failureMessages.join('\n')
    })));
  const passed = report.numPassedTests === report.numTotalTests &&
    report.numFailedTests === 0 &&
    report.numPendingTests === 0 &&
    testResult.exitCode === 0;
  const attempt = {
    task,
    tool,
    modelVersion: modelVersion.trim(),
    attemptNumber: context.nextAttempt,
    prompt: context.nextPrompt,
    response: code,
    startedAt,
    completedAt: new Date().toISOString(),
    status: passed ? 'Réussi' : 'Échec',
    testSummary: {
      passed: report.numPassedTests,
      total: report.numTotalTests,
      failed: report.numFailedTests,
      skipped: report.numPendingTests
    },
    testRun: {
      durationMs: testResult.durationMs,
      exitCode: testResult.exitCode,
      output: testResult.output,
      cases: testCases
    },
    failures,
    retryPrompt: passed ? '' : retryPrompt,
    evaluation: null
  };

  const directory = getAttemptDirectory(root, task, tool);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `attempt-${String(attempt.attemptNumber).padStart(2, '0')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(attempt, null, 2)}\n`, 'utf8');

  return {
    attempt,
    failures,
    exitCode: testResult.exitCode
  };
}

function recordAttemptEvaluation({ root, task, tool, attemptNumber, evaluation }) {
  const attempts = readAttempts(root, task, tool);
  const attempt = attempts.find((item) => item.attemptNumber === attemptNumber);
  if (!attempt) {
    throw new Error('Résultat de tentative introuvable.');
  }
  if (attempt.evaluation) {
    throw new Error('Cette tentative a déjà été évaluée.');
  }

  const scores = [
    evaluation.correctness,
    evaluation.quality,
    evaluation.security,
    evaluation.timeIterations,
    evaluation.hallucinations
  ];
  if (scores.some((score) => !Number.isInteger(score) || score < 0 || score > 5)) {
    throw new Error('Chaque critère doit recevoir une note entière comprise entre 0 et 5.');
  }
  if (!Number.isFinite(evaluation.minutes) || evaluation.minutes < 0) {
    throw new Error('Le temps doit être un nombre positif ou nul.');
  }
  if (typeof evaluation.remarks !== 'string') {
    throw new Error('Les remarques doivent être du texte.');
  }
  if (evaluation.remarks.trim().length === 0) {
    throw new Error('Une justification factuelle est obligatoire.');
  }

  const savedEvaluation = {
    correctness: evaluation.correctness,
    quality: evaluation.quality,
    security: evaluation.security,
    timeIterations: evaluation.timeIterations,
    hallucinations: evaluation.hallucinations,
    minutes: evaluation.minutes,
    remarks: evaluation.remarks.trim()
  };
  const file = path.join(
    getAttemptDirectory(root, task, tool),
    `attempt-${String(attemptNumber).padStart(2, '0')}.json`
  );
  attempt.evaluation = savedEvaluation;
  fs.writeFileSync(file, `${JSON.stringify(attempt, null, 2)}\n`, 'utf8');

  appendResult(task, {
    passedTests: attempt.testSummary.passed,
    totalTests: attempt.testSummary.total,
    attemptNumber
  }, {
    tool,
    modelVersion: attempt.modelVersion,
    correctness: savedEvaluation.correctness,
    quality: savedEvaluation.quality,
    security: savedEvaluation.security,
    timeIterations: savedEvaluation.timeIterations,
    hallucinations: savedEvaluation.hallucinations,
    minutes: savedEvaluation.minutes,
    remarks: savedEvaluation.remarks
  }, path.join(root, 'results', 'results.csv'));

  return attempt;
}

function resetBenchmark(root, task, tool) {
  const taskDirectory = getTaskDirectory(root, task);
  const toolConfig = TOOLS[tool];
  if (!toolConfig) {
    throw new Error(`Outil inconnu : ${tool}`);
  }

  const attemptDirectory = getAttemptDirectory(root, task, tool);
  let removedAttempts = 0;
  if (fs.existsSync(attemptDirectory)) {
    const attemptFiles = fs.readdirSync(attemptDirectory)
      .filter((name) => /^attempt-\d{2}\.json$/.test(name));
    for (const name of attemptFiles) {
      fs.unlinkSync(path.join(attemptDirectory, name));
      removedAttempts += 1;
    }
  }

  const submissionPath = path.join(
    taskDirectory,
    'submissions',
    `${toolConfig.file}.js`
  );
  const removedSubmission = fs.existsSync(submissionPath);
  if (removedSubmission) {
    fs.unlinkSync(submissionPath);
  }

  const removedResults = removeResults(
    task,
    tool,
    path.join(root, 'results', 'results.csv')
  );
  return { removedAttempts, removedResults, removedSubmission };
}

module.exports = {
  getAttemptContext,
  buildRetryPrompt,
  readAttempts,
  recordAttemptEvaluation,
  resetBenchmark,
  runAndRecordAttempt,
  summarizeTestCases
};
