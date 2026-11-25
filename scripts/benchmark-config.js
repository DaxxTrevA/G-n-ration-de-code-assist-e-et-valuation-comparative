const TOOLS = {
  'Cursor (Grok 4.7)': {
    file: 'cursor',
    directory: 'cursor-grok-4.7',
    defaultModel: 'Grok 4.7',
    person: 'A'
  },
  'GitHub Copilot': {
    file: 'copilot',
    directory: 'copilot',
    defaultModel: '',
    person: 'B'
  },
  'Cline (Qwen2.5-Coder 7B / Ollama)': {
    file: 'cline-qwen2.5-coder-7b',
    directory: 'cline-qwen2.5-coder-7b',
    defaultModel: 'Qwen2.5-Coder 7B (Ollama)',
    person: 'C'
  }
};

const TASK_PATTERN = /^T(?:0[1-9]|1[0-9]|20)$/;
const MAX_ATTEMPTS = 3;

module.exports = { MAX_ATTEMPTS, TASK_PATTERN, TOOLS };
