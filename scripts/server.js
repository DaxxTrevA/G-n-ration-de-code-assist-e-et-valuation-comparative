const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { readResults } = require('./evaluate');
const { buildComparison } = require('./comparison');
const {
  getAttemptContext,
  recordAttemptEvaluation,
  resetBenchmark,
  runAndRecordAttempt
} = require('./benchmark');
const { MAX_ATTEMPTS, TASK_PATTERN, TOOLS } = require('./benchmark-config');

const ROOT = path.join(__dirname, '..');
const TASKS_DIRECTORY = path.join(ROOT, 'tasks');
const PUBLIC_DIRECTORY = path.join(__dirname, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 1024 * 1024;
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8']
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Requête trop volumineuse.'), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Un objet JSON est attendu.');
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Corps JSON invalide.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function getTaskDirectory(task) {
  if (!TASK_PATTERN.test(task || '')) {
    throw Object.assign(new Error('Tâche inconnue : choisissez T01 à T20.'), { statusCode: 400 });
  }
  return path.join(TASKS_DIRECTORY, task);
}

function getToolFile(tool) {
  const toolConfig = TOOLS[tool];
  if (!toolConfig) {
    throw Object.assign(new Error('Outil inconnu.'), { statusCode: 400 });
  }
  return toolConfig.file;
}

function getTaskList() {
  return fs.readdirSync(TASKS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && TASK_PATTERN.test(entry.name))
    .map((entry) => {
      const taskDirectory = path.join(TASKS_DIRECTORY, entry.name);
      const readme = fs.readFileSync(path.join(taskDirectory, 'README.md'), 'utf8');
      const title = readme.match(/^#\s+.+$/m);
      return {
        id: entry.name,
        title: title ? title[0].replace(/^#\s+/, '') : entry.name,
        submissions: Object.fromEntries(
          Object.entries(TOOLS).map(([label, config]) => [
            label,
            fs.existsSync(path.join(taskDirectory, 'submissions', `${config.file}.js`))
          ])
        )
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/tasks') {
    sendJson(response, 200, getTaskList());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/results') {
    sendJson(response, 200, readResults());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/comparison') {
    sendJson(response, 200, buildComparison(getTaskList(), readResults()));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/attempts') {
    const task = url.searchParams.get('task');
    const tool = url.searchParams.get('tool');
    getTaskDirectory(task);
    getToolFile(tool);
    sendJson(response, 200, getAttemptContext(ROOT, task, tool));
    return;
  }

  if (request.method === 'DELETE' && url.pathname === '/api/benchmark') {
    const body = await readJsonBody(request);
    getTaskDirectory(body.task);
    getToolFile(body.tool);
    const reset = resetBenchmark(ROOT, body.task, body.tool);
    sendJson(response, 200, reset);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/submission') {
    const taskDirectory = getTaskDirectory(url.searchParams.get('task'));
    const tool = getToolFile(url.searchParams.get('tool'));
    const submissionPath = path.join(taskDirectory, 'submissions', `${tool}.js`);
    sendJson(response, 200, {
      code: fs.existsSync(submissionPath) ? fs.readFileSync(submissionPath, 'utf8') : ''
    });
    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/submission') {
    const body = await readJsonBody(request);
    const taskDirectory = getTaskDirectory(body.task);
    const tool = getToolFile(body.tool);
    if (typeof body.code !== 'string' || body.code.length > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Le code doit être du texte de moins de 1 Mo.'), {
        statusCode: 400
      });
    }
    const submissionsDirectory = path.join(taskDirectory, 'submissions');
    fs.mkdirSync(submissionsDirectory, { recursive: true });
    fs.writeFileSync(path.join(submissionsDirectory, `${tool}.js`), body.code, 'utf8');
    sendJson(response, 200, { saved: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/run') {
    const body = await readJsonBody(request);
    getTaskDirectory(body.task);
    getToolFile(body.tool);
    const result = runAndRecordAttempt({
      root: ROOT,
      task: body.task,
      tool: body.tool,
      code: body.code,
      modelVersion: body.modelVersion
    });
    sendJson(response, 200, {
      attempt: result.attempt,
      passed: result.attempt.testSummary.passed,
      total: result.attempt.testSummary.total,
      failed: result.attempt.testSummary.failed,
      skipped: result.attempt.testSummary.skipped,
      testRun: result.attempt.testRun,
      failures: result.failures,
      success: result.attempt.status === 'Réussi',
      nextPrompt: result.attempt.retryPrompt,
      canRetry: result.attempt.status !== 'Réussi' &&
        result.attempt.attemptNumber < MAX_ATTEMPTS
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/evaluate') {
    const body = await readJsonBody(request);
    getTaskDirectory(body.task);
    getToolFile(body.tool);
    const scoreFields = [
      'correctness',
      'quality',
      'security',
      'timeIterations',
      'hallucinations'
    ];
    const isNumber = (value) => (
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && /^\d+$/.test(value))
    );
    const isMinutes = (value) => (
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value))
    );
    if (
      !Number.isInteger(body.attemptNumber) ||
      scoreFields.some((field) => !isNumber(body[field])) ||
      scoreFields.some((field) => Number(body[field]) < 0 || Number(body[field]) > 5) ||
      !isMinutes(body.minutes) ||
      !Number.isFinite(Number(body.minutes)) || Number(body.minutes) < 0 ||
      typeof body.remarks !== 'string' ||
      body.remarks.trim().length === 0
    ) {
      throw Object.assign(new Error('Vérifiez les cinq notes (/5), le temps et les remarques.'), {
        statusCode: 400
      });
    }
    const attempt = recordAttemptEvaluation({
      root: ROOT,
      task: body.task,
      tool: body.tool,
      attemptNumber: body.attemptNumber,
      evaluation: {
        correctness: Number(body.correctness),
        quality: Number(body.quality),
        security: Number(body.security),
        timeIterations: Number(body.timeIterations),
        hallucinations: Number(body.hallucinations),
        minutes: Number(body.minutes),
        remarks: body.remarks
      }
    });
    sendJson(response, 200, {
      result: readResults().at(-1),
      attempt
    });
    return;
  }

  sendJson(response, 404, { error: 'Route introuvable.' });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }
    const taskReadme = url.pathname.match(/^\/tasks\/(T(?:0[1-9]|1[0-9]|20))\/README\.md$/);
    if (request.method === 'GET' && taskReadme) {
      const readmePath = path.join(getTaskDirectory(taskReadme[1]), 'README.md');
      response.writeHead(200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(fs.readFileSync(readmePath));
      return;
    }
    const asset = STATIC_FILES[url.pathname];
    if (!asset || request.method !== 'GET') {
      sendJson(response, 404, { error: 'Page introuvable.' });
      return;
    }
    const content = fs.readFileSync(path.join(PUBLIC_DIRECTORY, asset[0]));
    response.writeHead(200, {
      'Content-Type': asset[1],
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'"
    });
    response.end(content);
  } catch (error) {
    if (response.headersSent || response.destroyed) {
      return;
    }
    if (!error.statusCode) {
      console.error(error);
    }
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode ? error.message : 'Erreur interne du serveur.'
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Interface P27 disponible sur http://${HOST}:${PORT}`);
});
