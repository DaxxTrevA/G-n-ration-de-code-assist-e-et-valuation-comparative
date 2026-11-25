const { buildComparison } = require('../scripts/comparison');
const { TOOLS } = require('../scripts/benchmark-config');

const toolNames = Object.keys(TOOLS);
const task = { id: 'T01', title: 'T01 - Exemple' };

function result(tool, attemptNumber, scores) {
  return {
    task: 'T01',
    tool,
    attemptNumber: String(attemptNumber),
    ...Object.fromEntries([
      ['correctness', scores[0]],
      ['quality', scores[1]],
      ['security', scores[2]],
      ['timeIterations', scores[3]],
      ['hallucinations', scores[4]]
    ])
  };
}

describe('comparison report', () => {
  test('uses the last evaluated attempt and reports its rubric average as a percentage', () => {
    const rows = [
      result(toolNames[0], 1, [5, 5, 5, 5, 5]),
      result(toolNames[0], 2, [4, 3, 5, 2, 4]),
      result(toolNames[1], 1, [3, 3, 3, 3, 3]),
      result(toolNames[2], 1, [2, 2, 2, 2, 2])
    ];

    const [comparison] = buildComparison([task], rows, toolNames);
    expect(comparison.scores.map(({ percentage }) => percentage)).toEqual([72, 60, 40]);
    expect(comparison.scores[0].attemptNumber).toBe(2);
    expect(comparison.winner).toMatchObject({
      tool: toolNames[0],
      percentage: 72
    });
    expect(comparison.conclusion).toContain('72 %');
  });

  test('does not name a winner until all three tools have evaluated results', () => {
    const [comparison] = buildComparison(
      [task],
      [result(toolNames[0], 1, [5, 5, 5, 5, 5])],
      toolNames
    );

    expect(comparison.winner).toBe(null);
    expect(comparison.conclusion).toBe('En attente des résultats des 3 outils');
    expect(comparison.scores.map(({ percentage }) => percentage)).toEqual([100, null, null]);
  });

  test('reports equal scores as a tie', () => {
    const rows = toolNames.map((tool) => result(tool, 1, [4, 4, 4, 4, 4]));
    const [comparison] = buildComparison([task], rows, toolNames);

    expect(comparison.winner).toBe(null);
    expect(comparison.tiedWinners).toHaveLength(3);
    expect(comparison.conclusion).toBe('Égalité');
  });

  test('does not treat a missing rubric note as a zero score', () => {
    const incomplete = result(toolNames[0], 1, [5, 5, 5, 5, 5]);
    incomplete.security = '';
    const [comparison] = buildComparison(
      [task],
      [incomplete, result(toolNames[1], 1, [5, 5, 5, 5, 5]),
        result(toolNames[2], 1, [5, 5, 5, 5, 5])],
      toolNames
    );

    expect(comparison.scores[0].percentage).toBe(null);
    expect(comparison.winner).toBe(null);
    expect(comparison.conclusion).toBe('En attente des résultats des 3 outils');
  });
});
