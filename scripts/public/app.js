const tools = {
  'GitHub Copilot': 'copilot',
  Cursor: 'cursor',
  'Qwen Coder (Ollama)': 'qwen'
};

const state = {
  tasks: [],
  selectedTask: null,
  result: null
};

const elements = {
  taskList: document.querySelector('#task-list'),
  taskCount: document.querySelector('#task-count'),
  taskKicker: document.querySelector('#task-kicker'),
  taskTitle: document.querySelector('#task-title'),
  taskStatus: document.querySelector('#task-status'),
  taskDescription: document.querySelector('#task-description'),
  tool: document.querySelector('#tool'),
  code: document.querySelector('#code'),
  editorFile: document.querySelector('#editor-file'),
  saveRun: document.querySelector('#save-run'),
  reloadCode: document.querySelector('#reload-code'),
  testResult: document.querySelector('#test-result'),
  evaluationForm: document.querySelector('#evaluation-form'),
  resultsBody: document.querySelector('#results-body')
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
    dots.setAttribute('aria-label', 'Soumissions enregistrées');
    for (const tool of Object.values(tools)) {
      const dot = document.createElement('i');
      dot.className = task.submissions[tool] ? 'ready' : '';
      dots.append(dot);
    }
    button.append(copy, dots);
    button.addEventListener('click', () => selectTask(task.id));
    elements.taskList.append(button);
  }
  elements.taskCount.textContent = `${state.tasks.length} tâches`;
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
  elements.testResult.hidden = true;
  elements.evaluationForm.hidden = true;
  renderTaskList();
  await loadTask(taskId);
  await loadSubmission();
}

async function loadTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  elements.taskKicker.textContent = `EXERCICE ${taskId}`;
  elements.taskTitle.textContent = task.title;
  elements.taskStatus.textContent = Object.values(task.submissions).some(Boolean)
    ? 'Soumission prête'
    : 'À compléter';
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
  elements.editorFile.textContent = `${tools[tool]}.js`;
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
    cell.colSpan = 8;
    cell.className = 'empty-row';
    cell.textContent = 'Aucune évaluation pour le moment.';
    row.append(cell);
    elements.resultsBody.append(row);
    return;
  }

  for (const result of rows.slice().reverse()) {
    const row = document.createElement('tr');
    for (const value of [
      result.task,
      result.tool,
      result.passedTests,
      result.quality,
      result.security,
      result.trials,
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

function showTestResult(result) {
  state.result = result;
  elements.testResult.hidden = false;
  elements.testResult.classList.toggle('fail', !result.success);
  elements.testResult.replaceChildren();
  const title = document.createElement('p');
  title.className = 'result-title';
  title.textContent = result.success ? 'Tests terminés' : 'Certains tests échouent';
  const details = document.createElement('p');
  details.className = 'result-detail';
  details.textContent = `${result.passed} réussi(s) · ${result.failed} échoué(s) · ${result.skipped} ignoré(s)`;
  elements.testResult.append(title, details);

  for (const failure of result.failures || []) {
    const failureLine = document.createElement('p');
    failureLine.className = 'result-detail';
    failureLine.textContent = `${failure.name} : ${failure.message}`;
    elements.testResult.append(failureLine);
  }

  if (!result.submissionExists || result.skipped > 0) {
    const warning = document.createElement('p');
    warning.className = 'result-warning';
    warning.textContent = 'Cette soumission n’a pas exécuté tous les tests. Vérifiez les exports indiqués dans l’énoncé.';
    elements.testResult.append(warning);
  }
  elements.evaluationForm.hidden = !result.submissionExists;
}

elements.tool.addEventListener('change', () => {
  loadSubmission().catch(showError);
});

elements.reloadCode.addEventListener('click', () => {
  loadSubmission().catch(showError);
});

elements.saveRun.addEventListener('click', async () => {
  elements.saveRun.disabled = true;
  elements.saveRun.textContent = 'Enregistrement et exécution…';
  try {
    await api('/api/submission', {
      method: 'PUT',
      body: JSON.stringify({
        task: state.selectedTask,
        tool: elements.tool.value,
        code: elements.code.value
      })
    });
    const result = await api('/api/run', {
      method: 'POST',
      body: JSON.stringify({ task: state.selectedTask, tool: elements.tool.value })
    });
    showTestResult(result);
    await refreshTasks();
  } catch (error) {
    showError(error);
  } finally {
    elements.saveRun.disabled = false;
    elements.saveRun.innerHTML = 'Enregistrer et lancer les tests <span aria-hidden="true">→</span>';
  }
});

elements.evaluationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.result || !state.selectedTask) return;
  const form = new FormData(elements.evaluationForm);
  const payload = Object.fromEntries(form.entries());
  const trials = Number(payload.trials);
  if (!Number.isInteger(trials) || trials < 1 || trials > 3) {
    showError(new Error('Le protocole autorise de 1 à 3 essais.'));
    return;
  }
  try {
    const saved = await api('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        task: state.selectedTask,
        tool: elements.tool.value
      })
    });
    showTestResult(saved);
    await refreshResults();
    window.alert('Évaluation enregistrée dans results/results.csv.');
  } catch (error) {
    showError(error);
  }
});

document.querySelector('#refresh-results').addEventListener('click', () => {
  refreshResults().catch(showError);
});

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
