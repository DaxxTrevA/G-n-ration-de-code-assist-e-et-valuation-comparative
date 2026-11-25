const fs = require('node:fs');
const path = require('node:path');

function loadSubmission(taskDirectory) {
  const submissionPath = path.join(taskDirectory, 'submission.js');
  return fs.existsSync(submissionPath) ? require(submissionPath) : null;
}

module.exports = { loadSubmission };
