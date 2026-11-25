const { TOOLS } = require('./benchmark-config');

const SCORE_FIELDS = [
  'correctness',
  'quality',
  'security',
  'timeIterations',
  'hallucinations'
];

function getLatestEvaluations(results, toolNames) {
  const latest = new Map();
  for (const result of results) {
    if (!toolNames.includes(result.tool)) continue;
    const attemptNumber = Number(result.attemptNumber);
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1) continue;

    const key = `${result.task}\u0000${result.tool}`;
    const previous = latest.get(key);
    if (!previous || attemptNumber >= previous.attemptNumber) {
      latest.set(key, { ...result, attemptNumber });
    }
  }
  return latest;
}

function buildComparison(tasks, results, toolNames = Object.keys(TOOLS)) {
  const latest = getLatestEvaluations(results, toolNames);
  return tasks.map((task) => {
    const scores = toolNames.map((tool) => {
      const result = latest.get(`${task.id}\u0000${tool}`);
      if (!result) {
        return { tool, attemptNumber: null, percentage: null };
      }

      const values = SCORE_FIELDS.map((field) => {
        const score = result[field];
        if (score === undefined || score === null || String(score).trim() === '') {
          return Number.NaN;
        }
        return Number(score);
      });
      if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 5)) {
        return { tool, attemptNumber: result.attemptNumber, percentage: null };
      }

      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        tool,
        attemptNumber: result.attemptNumber,
        percentage: Math.round((total / (SCORE_FIELDS.length * 5)) * 100)
      };
    });

    const complete = scores.every((score) => score.percentage !== null);
    let winners = [];
    if (complete) {
      const highest = Math.max(...scores.map((score) => score.percentage));
      winners = scores.filter((score) => score.percentage === highest);
    }

    return {
      id: task.id,
      title: task.title,
      scores,
      winner: winners.length === 1 ? winners[0] : null,
      tiedWinners: winners.length > 1 ? winners : [],
      conclusion: !complete
        ? 'En attente des résultats des 3 outils'
        : winners.length > 1
          ? 'Égalité'
          : `${winners[0].tool} est en tête avec ${winners[0].percentage} %`
    };
  });
}

module.exports = { buildComparison };
