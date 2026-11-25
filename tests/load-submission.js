const fs = require('node:fs');
const path = require('node:path');

function loadSubmission(taskDirectory) {
  const tool = process.env.P27_TOOL;
  const toolFiles = {
    copilot: 'copilot.js',
    cursor: 'cursor.js',
    qwen: 'qwen.js'
  };
  const submissionPath = tool && toolFiles[tool]
    ? path.join(taskDirectory, 'submissions', toolFiles[tool])
    : path.join(taskDirectory, 'submission.js');
  return fs.existsSync(submissionPath) ? require(submissionPath) : null;
}

module.exports = { loadSubmission };
