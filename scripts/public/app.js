const tools = {
  'Cursor (Grok 4.7)': { file: 'cursor', model: 'Grok 4.7' },
  'GitHub Copilot': { file: 'copilot', model: 'GPT-6 Luna' },
  'Cline (Qwen2.5-Coder 7B / Ollama)': {
    file: 'cline-qwen2.5-coder-7b',
    model: 'Qwen2.5-Coder 7B (Ollama)'
  }
};

const state = {
  tasks: [],
  selectedTask: null,
  result: null,
  attemptContext: null
};

const elements = {
  taskList: document.querySelector('#task-list'),
  taskCount: document.querySelector('#task-count'),
  taskKicker: document.querySelector('#task-kicker'),
  taskTitle: document.querySelector('#task-title'),
  taskStatus: document.querySelector('#task-status'),
  taskDescription: document.querySelector('#task-description'),
  tool: document.querySelector('#tool'),
  modelVersion: document.querySelector('#model-version'),
  code: document.querySelector('#code'),
  promptTitle: document.querySelector('#prompt-title'),
  promptText: document.querySelector('#prompt-text'),
  promptHint: document.querySelector('#prompt-hint'),
  copyPrompt: document.querySelector('#copy-prompt'),
  attemptCount: document.querySelector('#attempt-count'),
  editorFile: document.querySelector('#editor-file'),
  saveRun: document.querySelector('#save-run'),
  reloadCode: document.querySelector('#reload-code'),
  resetBenchmark: document.querySelector('#reset-benchmark'),
  resetStatus: document.querySelector('#reset-status'),
  testResult: document.querySelector('#test-result'),
  executionPanel: document.querySelector('#execution-panel'),
  executionMeta: document.querySelector('#execution-meta'),
  executionOutput: document.querySelector('#execution-output'),
  testCasesPanel: document.querySelector('#test-cases-panel'),
  testCasesBody: document.querySelector('#test-cases-body'),
  retryPrompt: document.querySelector('#retry-prompt'),
  retryText: document.querySelector('#retry-text'),
  copyRetry: document.querySelector('#copy-retry'),
  evaluationForm: document.querySelector('#evaluation-form'),
  resultsBody: document.querySelector('#results-body'),
  evaluationView: document.querySelector('#evaluation-view'),
  comparisonView: document.querySelector('#comparison-view'),
  navEvaluation: document.querySelector('#nav-evaluation'),
  navComparison: document.querySelector('#nav-comparison'),
  comparisonBody: document.querySelector('#comparison-body')
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
}

function renderTaskList() {
  elements.taskList.replaceChildren();
  for (const task of state.tasks) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-button${task.id === state.selectedTask ? ' active' : ''}`;
    button.setAttribute('aria-pressed', String(task.id === state.selectedTask));

    const copy = document.createElement('span');
    copy.className = 'task-button-copy';
    const number = document.createElement('strong');
    number.textContent = task.id;
    const title = document.createElement('span');
    title.textContent = task.title.replace(/^T\d+\s*-\s*/, '');
    copy.append(number, title);

    const dots = document.createElement('span');
    dots.className = 'tool-dots';
    dots.setAttribute('aria-label', 'Code enregistré pour chaque outil');
    for (const tool of Object.keys(tools)) {
      const dot = document.createElement('i');
      dot.className = task.submissions[tool] ? 'ready' : '';
      dots.append(dot);
    }
    button.append(copy, dots);
    button.addEventListener('click', () => selectTask(task.id));
    elements.taskList.append(button);
  }
  elements.taskCount.textContent = `${state.tasks.length} exercices`;
}

function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    const node = document.createElement(match ? `h${match[1].length}` : 'p');
    if (match) {
      node.textContent = match[2];
    } else {
      const pieces = line.split(/(`[^`]+`)/g);
      for (const piece of pieces) {
        if (piece.startsWith('`') && piece.endsWith('`')) {
          const code = document.createElement('code');
          code.textContent = piece.slice(1, -1);
          node.append(code);
        } else {
          node.append(document.createTextNode(piece));
        }
      }
    }
    if (line || match) fragment.append(node);
  }
  elements.taskDescription.replaceChildren(fragment);
}

async function selectTask(taskId) {
  state.selectedTask = taskId;
  state.result = null;
  state.attemptContext = null;
  elements.resetStatus.hidden = true;
  elements.testResult.hidden = true;
  elements.executionPanel.hidden = true;
  elements.testCasesPanel.hidden = true;
  elements.evaluationForm.hidden = true;
  elements.retryPrompt.hidden = true;
  renderTaskList();
  await loadTask(taskId);
  await loadSubmission();
  await loadAttemptContext();
}

async function loadTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  elements.taskKicker.textContent = `EXERCICE ${taskId}`;
  elements.taskTitle.textContent = task.title;
  elements.taskStatus.textContent = Object.values(task.submissions).some(Boolean)
    ? 'Code enregistré'
    : 'Pas encore testé';
  elements.taskStatus.classList.toggle('ready', Object.values(task.submissions).some(Boolean));
  const response = await fetch(`/tasks/${taskId}/README.md`);
  if (!response.ok) throw new Error(`Énoncé introuvable pour ${taskId}.`);
  renderMarkdown(await response.text());
}

async function loadSubmission() {
  const tool = elements.tool.value;
  const submission = await api(
    `/api/submission?task=${encodeURIComponent(state.selectedTask)}&tool=${encodeURIComponent(tool)}`
  );
  elements.code.value = submission.code;
  elements.editorFile.textContent = `${tools[tool].file}.js`;
  elements.modelVersion.value = tools[tool].model;
  elements.modelVersion.readOnly = Boolean(tools[tool].model);
  elements.modelVersion.required = true;
  elements.modelVersion.placeholder = tools[tool].model
    ? 'Modèle fixé par le protocole'
    : 'Sélectionnez le modèle exact dans Copilot';
}

async function loadAttemptContext() {
  const tool = elements.tool.value;
  const context = await api(
    `/api/attempts?task=${encodeURIComponent(state.selectedTask)}&tool=${encodeURIComponent(tool)}`
  );
  state.attemptContext = context;
  const lastAttempt = context.attempts.at(-1);
  const currentAttempt = context.attempts.length + (context.isComplete ? 0 : 1);
  elements.attemptCount.textContent = context.isComplete
    ? `Exercice terminé · ${context.attempts.length} essai(s)`
    : `Essai ${currentAttempt} sur 3`;
  elements.promptTitle.textContent = currentAttempt > 1
    ? `Erreur à transmettre pour l’essai ${currentAttempt}`
    : 'Consigne de l’exercice';
  elements.promptText.textContent = context.nextPrompt ||
    (lastAttempt && lastAttempt.prompt) ||
    'Cette tâche est terminée pour cet outil.';
  elements.promptHint.textContent = currentAttempt > 1
    ? 'Copiez ce message sans ajouter d’explication.'
    : 'Envoyez cette consigne telle quelle à l’outil choisi.';
  elements.copyPrompt.disabled = !context.nextPrompt;
  elements.saveRun.disabled = context.isComplete;
  elements.saveRun.innerHTML = context.isComplete
    ? 'Exercice terminé'
    : 'Lancer les tests <span aria-hidden="true">→</span>';

  if (lastAttempt) {
    elements.code.value = lastAttempt.response;
    showTestResult({
      attempt: lastAttempt,
      passed: lastAttempt.testSummary.passed,
      total: lastAttempt.testSummary.total,
      failed: lastAttempt.testSummary.failed,
      skipped: lastAttempt.testSummary.skipped,
      failures: lastAttempt.failures || [],
      testRun: lastAttempt.testRun,
      nextPrompt: lastAttempt.retryPrompt,
      canRetry: !context.awaitingEvaluation &&
        !context.isComplete &&
        lastAttempt.status !== 'Réussi' &&
        lastAttempt.attemptNumber < 3,
      success: lastAttempt.status === 'Réussi'
    }, !lastAttempt.evaluation);
  } else {
    state.result = null;
    elements.testResult.hidden = true;
    elements.executionPanel.hidden = true;
    elements.testCasesPanel.hidden = true;
    elements.evaluationForm.hidden = true;
    elements.retryPrompt.hidden = !context.nextPrompt || currentAttempt === 1;
    if (elements.retryPrompt.hidden) {
      elements.retryText.textContent = '';
    } else {
      elements.retryText.textContent = context.nextPrompt;
    }
    if (!context.isComplete) {
      elements.saveRun.disabled = false;
      elements.saveRun.innerHTML = 'Lancer les tests <span aria-hidden="true">→</span>';
    }
  }
}

async function refreshTasks() {
  state.tasks = await api('/api/tasks');
  renderTaskList();
}

async function refreshResults() {
  const rows = await api('/api/results');
  elements.resultsBody.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 12;
    cell.className = 'empty-row';
    cell.textContent = 'Aucun résultat enregistré pour le moment.';
    row.append(cell);
    elements.resultsBody.append(row);
    return;
  }

  for (const result of rows.slice().reverse()) {
    const row = document.createElement('tr');
    for (const value of [
      result.task,
      result.tool,
      result.modelVersion,
      `${result.attemptNumber}/3`,
      `${result.passedTests}/${result.totalTests}`,
      result.correctness,
      result.quality,
      result.security,
      result.timeIterations,
      result.hallucinations,
      result.minutes,
      result.remarks
    ]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      cell.title = value;
      row.append(cell);
    }
    elements.resultsBody.append(row);
  }
}

async function refreshComparison() {
  const comparisons = await api('/api/comparison');
  elements.comparisonBody.replaceChildren();
  for (const comparison of comparisons) {
    const row = document.createElement('tr');
    const taskCell = document.createElement('td');
    taskCell.className = 'comparison-task';
    const taskId = document.createElement('strong');
    taskId.textContent = comparison.id;
    const taskTitle = document.createElement('span');
    taskTitle.textContent = comparison.title.replace(/^T\d+\s*-\s*/, '');
    taskCell.append(taskId, taskTitle);
    row.append(taskCell);

    for (const score of comparison.scores) {
      const cell = document.createElement('td');
      cell.className = 'comparison-score';
      if (score.percentage === null) {
        cell.textContent = 'Non évalué';
        cell.classList.add('not-evaluated');
      } else {
        cell.textContent = `${score.percentage} %`;
        const attempt = document.createElement('small');
        attempt.textContent = `Essai ${score.attemptNumber}`;
        cell.append(attempt);
        const isWinner = comparison.winner
          ? comparison.winner.tool === score.tool
          : comparison.tiedWinners.some((winner) => winner.tool === score.tool);
        if (isWinner) cell.classList.add('winner-score');
      }
      row.append(cell);
    }

    const conclusion = document.createElement('td');
    conclusion.className = 'comparison-conclusion';
    conclusion.textContent = comparison.conclusion;
    if (!comparison.winner && comparison.tiedWinners.length === 0) {
      conclusion.classList.add('awaiting-results');
    } else if (comparison.tiedWinners.length > 0) {
      conclusion.classList.add('tie-result');
    }
    row.append(conclusion);
    elements.comparisonBody.append(row);
  }
}

function showView(view) {
  const showComparison = view === 'comparison';
  elements.evaluationView.hidden = showComparison;
  elements.comparisonView.hidden = !showComparison;
  elements.navEvaluation.classList.toggle('active', !showComparison);
  elements.navComparison.classList.toggle('active', showComparison);
  if (showComparison) {
    elements.navEvaluation.removeAttribute('aria-current');
    elements.navComparison.setAttribute('aria-current', 'page');
  } else {
    elements.navComparison.removeAttribute('aria-current');
    elements.navEvaluation.setAttribute('aria-current', 'page');
  }
  if (showComparison) refreshComparison().catch(showError);
}

function renderTestCases(cases, emptyMessage = 'Aucun cas de test détaillé retourné par Jest.') {
  elements.testCasesBody.replaceChildren();
  for (const testCase of cases || []) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = testCase.name || 'Test sans nom';
    const status = document.createElement('td');
    const statusLabel = {
      passed: 'Réussi',
      failed: 'Échec',
      pending: 'Ignoré',
      skipped: 'Ignoré',
      todo: 'À faire',
      disabled: 'Ignoré'
    }[testCase.status] || testCase.status || 'Inconnu';
    status.textContent = statusLabel;
    status.className = `test-case-status ${testCase.status || ''}`;
    const duration = document.createElement('td');
    duration.textContent = Number.isFinite(testCase.durationMs)
      ? String(testCase.durationMs)
      : '—';
    const detail = document.createElement('td');
    detail.className = 'test-case-detail';
    detail.textContent = testCase.details ||
      (testCase.status === 'passed'
        ? 'Aucun écart signalé par Jest.'
        : 'Aucun détail fourni par Jest.');
    row.append(name, status, duration, detail);
    elements.testCasesBody.append(row);
  }
  elements.testCasesPanel.hidden = false;
  if (!elements.testCasesBody.childElementCount) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty-row';
    cell.textContent = emptyMessage;
    row.append(cell);
    elements.testCasesBody.append(row);
  }
}

function showTestResult(result, awaitingEvaluation = true) {
  state.result = awaitingEvaluation ? result : null;
  elements.testResult.hidden = false;
  elements.testResult.classList.toggle('fail', !result.success);
  elements.testResult.replaceChildren();
  const title = document.createElement('p');
  title.className = 'result-title';
  title.textContent = result.success
    ? `Les tests sont réussis à l’essai ${result.attempt.attemptNumber}`
    : `Résultat de l’essai ${result.attempt.attemptNumber}`;
  const details = document.createElement('p');
  details.className = 'result-detail';
  details.textContent = `${result.passed} sur ${result.total} cas de test réussis · ${result.failed} échoué(s) · ${result.skipped} non exécuté(s)`;
  elements.testResult.append(title, details);

  const testRun = result.testRun || result.attempt.testRun;
  elements.executionPanel.hidden = false;
  if (testRun) {
    elements.executionMeta.textContent =
      `${testRun.durationMs} ms · code de sortie ${testRun.exitCode}`;
    elements.executionOutput.textContent = [
      `$ Jest ${result.attempt.task} · ${result.attempt.tool}`,
      testRun.output || 'Jest n’a produit aucune sortie.',
      `\nTerminé en ${testRun.durationMs} ms avec le code ${testRun.exitCode}.`
    ].join('\n');
    renderTestCases(testRun.cases);
  } else {
    elements.executionMeta.textContent = 'Ancien essai · journal indisponible';
    elements.executionOutput.textContent =
      'La sortie détaillée n’a pas été conservée pour cet essai.';
    renderTestCases([], 'Les détails par cas n’ont pas été archivés pour cet essai précédent.');
  }

  for (const failure of result.failures || []) {
    const failureLine = document.createElement('p');
    failureLine.className = 'result-detail';
    failureLine.textContent = `${failure.name} : ${failure.message}`;
    elements.testResult.append(failureLine);
  }

  if (result.skipped > 0) {
    const warning = document.createElement('p');
    warning.className = 'result-warning';
    warning.textContent = 'Tous les tests n’ont pas été exécutés. Vérifiez les consignes de l’exercice.';
    elements.testResult.append(warning);
  }
  elements.evaluationForm.hidden = !awaitingEvaluation;
  elements.retryPrompt.hidden = !result.canRetry;
  elements.retryText.textContent = result.canRetry ? result.nextPrompt : '';
  elements.saveRun.classList.remove('is-running');
  if (result.success) {
    elements.saveRun.disabled = true;
    elements.saveRun.textContent = 'Essai réussi';
  } else if (result.canRetry && awaitingEvaluation) {
    elements.saveRun.disabled = true;
    elements.saveRun.textContent = 'Noter avant de continuer';
  } else if (result.canRetry) {
    elements.saveRun.disabled = false;
    elements.saveRun.textContent = 'Lancer l’essai suivant';
  } else {
    elements.saveRun.disabled = true;
    elements.saveRun.innerHTML = 'Les 3 essais sont terminés';
  }
}

elements.tool.addEventListener('change', () => {
  state.result = null;
  elements.resetStatus.hidden = true;
  Promise.resolve()
    .then(loadSubmission)
    .then(loadAttemptContext)
    .catch(showError);
});

elements.reloadCode.addEventListener('click', () => {
  loadSubmission().catch(showError);
});

elements.resetBenchmark.addEventListener('click', async () => {
  if (!state.selectedTask) return;
  const task = state.selectedTask;
  const tool = elements.tool.value;
  const confirmed = window.confirm(
    `Réinitialiser ${task} pour ${tool} ? Cela supprimera le code collé, ` +
    'les anciens essais et leurs lignes dans les résultats. ' +
    'Les autres exercices et outils ne seront pas modifiés.'
  );
  if (!confirmed) return;

  elements.resetBenchmark.disabled = true;
  elements.resetStatus.hidden = true;
  try {
    const removed = await api('/api/benchmark', {
      method: 'DELETE',
      body: JSON.stringify({ task, tool })
    });
    state.result = null;
    elements.testResult.hidden = true;
    elements.evaluationForm.hidden = true;
    elements.retryPrompt.hidden = true;
    elements.evaluationForm.reset();
    await Promise.all([refreshTasks(), refreshResults()]);
    await loadSubmission();
    await loadAttemptContext();
    elements.resetStatus.textContent = removed.removedAttempts || removed.removedSubmission ||
      removed.removedResults
      ? 'Exercice réinitialisé. Tu peux recommencer à l’essai 1.'
      : 'Il n’y avait aucun ancien essai à effacer.';
    elements.resetStatus.hidden = false;
  } catch (error) {
    showError(error);
  } finally {
    elements.resetBenchmark.disabled = false;
  }
});

elements.saveRun.addEventListener('click', async () => {
  state.result = null;
  elements.saveRun.disabled = true;
  elements.saveRun.classList.add('is-running');
  elements.saveRun.textContent = 'Tests en cours…';
  elements.executionPanel.hidden = false;
  elements.executionMeta.textContent = 'Exécution en cours…';
  elements.executionOutput.textContent =
    `$ Jest ${state.selectedTask} · ${elements.tool.value}\nLancement des tests…`;
  elements.testCasesPanel.hidden = true;
  try {
    const result = await api('/api/run', {
      method: 'POST',
      body: JSON.stringify({
        task: state.selectedTask,
        tool: elements.tool.value,
        modelVersion: elements.modelVersion.value,
        code: elements.code.value
      })
    });
    showTestResult(result);
    await refreshTasks();
    state.attemptContext = await api(
      `/api/attempts?task=${encodeURIComponent(state.selectedTask)}&tool=${encodeURIComponent(elements.tool.value)}`
    );
    elements.attemptCount.textContent =
      `Essai ${result.attempt.attemptNumber} sur 3 · résultats enregistrés`;
  } catch (error) {
    showError(error);
    elements.executionMeta.textContent = 'Erreur d’exécution';
    elements.executionOutput.textContent = error.message;
    elements.testCasesPanel.hidden = true;
  } finally {
    elements.saveRun.classList.remove('is-running');
    if (!state.result) {
      const context = state.attemptContext;
      elements.saveRun.disabled = Boolean(
        context && (context.isComplete || context.awaitingEvaluation)
      );
      elements.saveRun.textContent = context && context.awaitingEvaluation
        ? 'Noter avant de continuer'
        : context && context.isComplete
          ? 'Exercice terminé'
          : 'Lancer les tests';
    }
  }
});

elements.evaluationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.result || !state.selectedTask) return;
  const form = new FormData(elements.evaluationForm);
  const payload = Object.fromEntries(form.entries());
  try {
    await api('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        task: state.selectedTask,
        tool: elements.tool.value,
        attemptNumber: state.result.attempt.attemptNumber
      })
    });
    state.result = null;
    elements.evaluationForm.hidden = true;
    elements.retryPrompt.hidden = true;
    await loadAttemptContext();
    await refreshResults();
  } catch (error) {
    showError(error);
  }
});

async function copyPrompt(value, button, originalText) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  button.textContent = 'Copié';
  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1500);
}

elements.copyPrompt.addEventListener('click', () => {
  copyPrompt(elements.promptText.textContent, elements.copyPrompt, 'Copier la consigne')
    .catch(showError);
});

elements.copyRetry.addEventListener('click', () => {
  copyPrompt(elements.retryText.textContent, elements.copyRetry, 'Copier l’erreur exacte')
    .catch(showError);
});

document.querySelector('#refresh-results').addEventListener('click', () => {
  refreshResults().catch(showError);
});

elements.navEvaluation.addEventListener('click', () => showView('evaluation'));
elements.navComparison.addEventListener('click', () => showView('comparison'));
document.querySelector('#print-comparison').addEventListener('click', () => window.print());

function showError(error) {
  elements.testResult.hidden = false;
  elements.testResult.classList.add('fail');
  elements.testResult.replaceChildren();
  const title = document.createElement('p');
  title.className = 'result-title';
  title.textContent = 'Impossible de terminer l’action';
  const details = document.createElement('p');
  details.className = 'result-detail';
  details.textContent = error.message;
  elements.testResult.append(title, details);
}

async function start() {
  await Promise.all([refreshTasks(), refreshResults()]);
  if (state.tasks.length > 0) {
    await selectTask(state.tasks[0].id);
  }
}

start().catch(showError);
