export type RankablePortfolioRow = { id: string; score: number | null };

/** Competition ranking (#1, #2, #2, #4) over the technical score only. */
export function rankOpportunityPortfolio<T extends RankablePortfolioRow>(rows: T[]) {
  const ordered = [...rows].filter((row) => row.score !== null).sort((a, b) => (b.score as number) - (a.score as number) || a.id.localeCompare(b.id));
  const ranks = new Map<string, number>();
  ordered.forEach((row, index) => {
    const previous = index > 0 ? ordered[index - 1].score : undefined;
    ranks.set(row.id, previous === row.score ? (ranks.get(ordered[index - 1].id) as number) : index + 1);
  });
  return rows.map((row) => ({ ...row, globalRank: row.score === null ? null : ranks.get(row.id) ?? null }));
}

export function displayPortfolioScore(score: number | null) {
  if (score === null) return '—';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
