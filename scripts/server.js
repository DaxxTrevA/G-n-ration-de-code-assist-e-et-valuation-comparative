const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {
  appendResult,
  readResults,
  runTaskTests
} = require('./evaluate');

const ROOT = path.join(__dirname, '..');
const TASKS_DIRECTORY = path.join(ROOT, 'tasks');
const PUBLIC_DIRECTORY = path.join(__dirname, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 1024 * 1024;
const TASK_PATTERN = /^T(?:0[1-9]|1[0-9]|20)$/;
const TOOL_FILES = {
  'GitHub Copilot': 'copilot',
  Cursor: 'cursor',
  'Qwen Coder (Ollama)': 'qwen'
};
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
  if (!TOOL_FILES[tool]) {
    throw Object.assign(new Error('Outil inconnu.'), { statusCode: 400 });
  }
  return TOOL_FILES[tool];
}

function getFailures(report) {
  return report.testResults.flatMap((suite) => suite.assertionResults
    .filter((assertion) => assertion.status === 'failed')
    .map((assertion) => ({
      name: assertion.fullName,
      message: assertion.failureMessages.join('\n')
    })));
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
          Object.values(TOOL_FILES).map((tool) => [
            tool,
            fs.existsSync(path.join(taskDirectory, 'submissions', `${tool}.js`))
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
    const result = runTaskTests(body.task, body.tool);
    sendJson(response, 200, {
      passed: result.report.numPassedTests,
      failed: result.report.numFailedTests,
      skipped: result.report.numPendingTests,
      submissionExists: result.submissionExists,
      failures: getFailures(result.report),
      success: result.submissionExists &&
        result.report.numPendingTests === 0 &&
        result.exitCode === 0 &&
        result.report.numFailedTests === 0
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/evaluate') {
    const body = await readJsonBody(request);
    getTaskDirectory(body.task);
    if (!TOOL_FILES[body.tool]) {
      throw Object.assign(new Error('Outil inconnu.'), { statusCode: 400 });
    }
    const numericFields = ['quality', 'security', 'trials', 'minutes'];
    const isNumber = (value) => (
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value))
    );
    if (
      numericFields.some((field) => !isNumber(body[field])) ||
      Number(body.quality) < 0 || Number(body.quality) > 5 ||
      Number(body.security) < 0 || Number(body.security) > 5 ||
      !Number.isInteger(Number(body.trials)) || Number(body.trials) < 1 || Number(body.trials) > 3 ||
      !Number.isFinite(Number(body.minutes)) || Number(body.minutes) < 0 ||
      typeof body.remarks !== 'string'
    ) {
      throw Object.assign(new Error('Vérifiez les notes, le nombre d’essais et le temps saisis.'), {
        statusCode: 400
      });
    }
    const result = runTaskTests(body.task, body.tool);
    appendResult(body.task, {
      passedTests: result.report.numPassedTests,
      skippedSuites: result.report.numPendingTestSuites,
      submissionExists: result.submissionExists
    }, {
      tool: body.tool,
      quality: String(body.quality),
      security: String(body.security),
      trials: String(body.trials),
      minutes: String(body.minutes),
      remarks: body.remarks.trim()
    });
    sendJson(response, 200, {
      result: readResults().at(-1),
      passed: result.report.numPassedTests,
      failed: result.report.numFailedTests,
      skipped: result.report.numPendingTests,
      failures: getFailures(result.report),
      success: result.submissionExists &&
        result.report.numPendingTests === 0 &&
        result.exitCode === 0 &&
        result.report.numFailedTests === 0
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
