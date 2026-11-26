const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  buildRetryPrompt,
  getAttemptContext,
  readAttempts,
  recordAttemptEvaluation,
  resetBenchmark
} = require('../scripts/benchmark');
const { TOOLS } = require('../scripts/benchmark-config');
const { appendResult, readResults } = require('../scripts/evaluate');

describe('benchmark attempt records', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'p27-benchmark-test-'));
    fs.mkdirSync(path.join(root, 'tasks', 'T01', 'submissions'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'tasks', 'T01', 'README.md'),
      '# T01 - Test prompt\n\nÉnoncé identique envoyé aux assistants.',
      'utf8'
    );
    fs.mkdirSync(path.join(root, 'results'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('fixes the Copilot benchmark model to GPT-6 Luna', () => {
    expect(TOOLS['GitHub Copilot'].defaultModel).toBe('GPT-6 Luna');
  });

  test('uses the exact task statement for the first attempt', () => {
    const context = getAttemptContext(root, 'T01', 'Cursor (Grok 4.7)');
    expect(context.nextAttempt).toBe(1);
    expect(context.isComplete).toBe(false);
    expect(context.nextPrompt).toBe(
      '# T01 - Test prompt\n\nÉnoncé identique envoyé aux assistants.'
    );
  });

  test('uses Jest output when no assertion failure is available', () => {
    expect(buildRetryPrompt({
      testResults: [{ assertionResults: [], failureMessage: '' }]
    }, 'Jest: No tests found')).toBe('Jest: No tests found');
  });

  test('uses only the prior test error on a retry and stops after success', () => {
    const tool = TOOLS['GitHub Copilot'];
    const directory = path.join(root, 'results', tool.directory, 'T01');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'attempt-01.json'), JSON.stringify({
      attemptNumber: 1,
      status: 'Échec',
      retryPrompt: 'Expected: Bonjour\nReceived: bonjour',
      evaluation: {}
    }));

    const retry = getAttemptContext(root, 'T01', 'GitHub Copilot');
    expect(retry.nextAttempt).toBe(2);
    expect(retry.nextPrompt).toBe('Expected: Bonjour\nReceived: bonjour');

    fs.writeFileSync(path.join(directory, 'attempt-02.json'), JSON.stringify({
      attemptNumber: 2,
      status: 'Réussi',
      retryPrompt: '',
      evaluation: {}
    }));
    const complete = getAttemptContext(root, 'T01', 'GitHub Copilot');
    expect(complete.isComplete).toBe(true);
    expect(complete.nextPrompt).toBe('');
  });

  test('requires an evaluation before preparing the following attempt', () => {
    const tool = TOOLS['GitHub Copilot'];
    const directory = path.join(root, 'results', tool.directory, 'T01');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'attempt-01.json'), JSON.stringify({
      attemptNumber: 1,
      status: 'Échec',
      retryPrompt: 'Erreur exacte des tests',
      evaluation: null
    }));

    const context = getAttemptContext(root, 'T01', 'GitHub Copilot');
    expect(context.awaitingEvaluation).toBe(true);
    expect(context.nextAttempt).toBe(null);
    expect(context.nextPrompt).toBe('');
  });

  test('blocks attempts after the three-attempt limit', () => {
    const tool = TOOLS['GitHub Copilot'];
    const directory = path.join(root, 'results', tool.directory, 'T01');
    fs.mkdirSync(directory, { recursive: true });
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      fs.writeFileSync(
        path.join(directory, `attempt-${String(attemptNumber).padStart(2, '0')}.json`),
        JSON.stringify({
          attemptNumber,
          status: 'Échec',
          retryPrompt: 'Erreur exacte des tests',
          evaluation: {}
        })
      );
    }

    const context = getAttemptContext(root, 'T01', 'GitHub Copilot');
    expect(context.isComplete).toBe(true);
    expect(context.nextAttempt).toBe(null);
    expect(context.nextPrompt).toBe('');
  });

  test('records all five rubric scores and links them to the attempt', () => {
    const toolName = 'Cline (Qwen2.5-Coder 7B / Ollama)';
    const directory = path.join(root, 'results', TOOLS[toolName].directory, 'T01');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'attempt-01.json'), JSON.stringify({
      task: 'T01',
      tool: toolName,
      modelVersion: 'Qwen2.5-Coder 7B (Ollama)',
      attemptNumber: 1,
      status: 'Réussi',
      testSummary: { passed: 3, total: 3, failed: 0, skipped: 0 },
      evaluation: null
    }));

    const attempt = recordAttemptEvaluation({
      root,
      task: 'T01',
      tool: toolName,
      attemptNumber: 1,
      evaluation: {
        correctness: 5,
        quality: 4,
        security: 5,
        timeIterations: 4,
        hallucinations: 5,
        minutes: 6.5,
        remarks: 'Aucun fait inventé.'
      }
    });

    expect(attempt.evaluation).toMatchObject({
      correctness: 5,
      quality: 4,
      security: 5,
      timeIterations: 4,
      hallucinations: 5,
      minutes: 6.5
    });
    expect(readResults(path.join(root, 'results', 'results.csv'))).toHaveLength(1);
  });

  test('requires a factual justification with the rubric evaluation', () => {
    const toolName = 'GitHub Copilot';
    const directory = path.join(root, 'results', TOOLS[toolName].directory, 'T01');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'attempt-01.json'), JSON.stringify({
      task: 'T01',
      tool: toolName,
      modelVersion: 'GPT-6 Luna',
      attemptNumber: 1,
      status: 'Réussi',
      testSummary: { passed: 3, total: 3, failed: 0, skipped: 0 },
      evaluation: null
    }));

    expect(() => recordAttemptEvaluation({
      root,
      task: 'T01',
      tool: toolName,
      attemptNumber: 1,
      evaluation: {
        correctness: 5,
        quality: 5,
        security: 5,
        timeIterations: 5,
        hallucinations: 5,
        minutes: 2,
        remarks: '   '
      }
    })).toThrow('justification factuelle');
  });

  test('resets only the selected task and tool, including code and CSV rows', () => {
    const selectedTool = 'Cursor (Grok 4.7)';
    const otherTool = 'GitHub Copilot';
    const selectedAttemptDirectory = path.join(
      root,
      'results',
      TOOLS[selectedTool].directory,
      'T01'
    );
    const otherAttemptDirectory = path.join(
      root,
      'results',
      TOOLS[otherTool].directory,
      'T01'
    );
    fs.mkdirSync(selectedAttemptDirectory, { recursive: true });
    fs.mkdirSync(otherAttemptDirectory, { recursive: true });
    fs.writeFileSync(path.join(selectedAttemptDirectory, 'attempt-01.json'), '{}');
    fs.writeFileSync(path.join(selectedAttemptDirectory, 'attempt-02.json'), '{}');
    fs.writeFileSync(path.join(otherAttemptDirectory, 'attempt-01.json'), '{}');
    fs.writeFileSync(
      path.join(root, 'tasks', 'T01', 'submissions', `${TOOLS[selectedTool].file}.js`),
      'module.exports = {};'
    );
    fs.writeFileSync(
      path.join(root, 'tasks', 'T01', 'submissions', `${TOOLS[otherTool].file}.js`),
      'module.exports = {};'
    );

    for (const [task, tool] of [
      ['T01', selectedTool],
      ['T01', otherTool],
      ['T02', selectedTool]
    ]) {
      appendResult(task, { passedTests: 1, totalTests: 1, attemptNumber: 1 }, {
        tool,
        modelVersion: 'Test model',
        correctness: 3,
        quality: 3,
        security: 3,
        timeIterations: 3,
        hallucinations: 3,
        minutes: 1,
        remarks: ''
      }, path.join(root, 'results', 'results.csv'));
    }

    expect(resetBenchmark(root, 'T01', selectedTool)).toEqual({
      removedAttempts: 2,
      removedResults: 1,
      removedSubmission: true
    });
    expect(readAttempts(root, 'T01', selectedTool)).toEqual([]);
    expect(fs.existsSync(path.join(
      root,
      'tasks',
      'T01',
      'submissions',
      `${TOOLS[selectedTool].file}.js`
    ))).toBe(false);
    expect(fs.existsSync(path.join(
      root,
      'tasks',
      'T01',
      'submissions',
      `${TOOLS[otherTool].file}.js`
    ))).toBe(true);
    expect(readResults(path.join(root, 'results', 'results.csv')).map(({ task, tool }) => [
      task,
      tool
    ])).toEqual([
      ['T01', otherTool],
      ['T02', selectedTool]
    ]);
  });
});
