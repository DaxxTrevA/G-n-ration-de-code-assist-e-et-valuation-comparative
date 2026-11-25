const fs = require('node:fs');
const path = require('node:path');
const { TOOLS } = require('../scripts/benchmark-config');

function loadSubmission(taskDirectory) {
  const tool = Object.values(TOOLS).find((config) => config.file === process.env.P27_TOOL);
  const submissionPath = tool
    ? path.join(taskDirectory, 'submissions', `${tool.file}.js`)
    : path.join(taskDirectory, 'submission.js');
  return fs.existsSync(submissionPath) ? require(submissionPath) : null;
}

module.exports = { loadSubmission };
