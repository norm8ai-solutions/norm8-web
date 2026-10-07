export const OPPORTUNITY_MATRIX_CONFIG = {
  businessValueHigh: 70,
  feasibilityHigh: 70,
  minCoverage: 60,
  minConfidence: 50,
} as const;

export type MatrixClassification = 'NEEDS_EVALUATION' | 'NEEDS_RECALCULATION' | 'NEEDS_VALIDATION' | 'QUICK_WIN_CANDIDATE' | 'STRATEGIC_BET_CANDIDATE' | 'SELECTIVE_OPPORTUNITY' | 'LOWER_PRIORITY_CANDIDATE';
export type MatrixDecision = { matrixPosition: 'HIGH_HIGH' | 'HIGH_LOW' | 'LOW_HIGH' | 'LOW_LOW' | null; classification: MatrixClassification; label: string; reason: string; decisionReady: boolean };

const labels: Record<MatrixClassification, string> = {
  NEEDS_EVALUATION: 'Needs Evaluation', NEEDS_RECALCULATION: 'Needs Recalculation', NEEDS_VALIDATION: 'Needs Validation',
  QUICK_WIN_CANDIDATE: 'Quick Win Candidate', STRATEGIC_BET_CANDIDATE: 'Strategic Bet Candidate', SELECTIVE_OPPORTUNITY: 'Selective Opportunity', LOWER_PRIORITY_CANDIDATE: 'Lower Priority Candidate',
};

export function classifyOpportunityDecision(input: { businessValueScore: number | null; feasibilityScore: number | null; confidence: number | null; coverage: number | null; scoreState: 'CURRENT' | 'STALE' | 'UNSCORED' | 'SCORED_NULL' }): MatrixDecision {
  if (input.scoreState === 'UNSCORED' || input.scoreState === 'SCORED_NULL') return result('NEEDS_EVALUATION', null, 'No usable score is available for the matrix.');
  if (input.scoreState === 'STALE') return result('NEEDS_RECALCULATION', null, 'The score snapshot is stale and must be recalculated before classification.');
  if (input.businessValueScore === null || input.feasibilityScore === null) return result('NEEDS_EVALUATION', null, 'Business Value and Automation Feasibility are required for matrix placement.');
  const failures: string[] = [];
  if (input.coverage === null || input.coverage < OPPORTUNITY_MATRIX_CONFIG.minCoverage) failures.push(`Evidence coverage is ${format(input.coverage)}%, below the ${OPPORTUNITY_MATRIX_CONFIG.minCoverage}% decision threshold.`);
  if (input.confidence === null || input.confidence < OPPORTUNITY_MATRIX_CONFIG.minConfidence) failures.push(`Evidence confidence is ${format(input.confidence)}%, below the ${OPPORTUNITY_MATRIX_CONFIG.minConfidence}% decision threshold.`);
  if (failures.length) return result('NEEDS_VALIDATION', null, failures.join(' '));
  const highValue = input.businessValueScore >= OPPORTUNITY_MATRIX_CONFIG.businessValueHigh; const highFeasibility = input.feasibilityScore >= OPPORTUNITY_MATRIX_CONFIG.feasibilityHigh;
  const position = highValue ? (highFeasibility ? 'HIGH_HIGH' : 'HIGH_LOW') : (highFeasibility ? 'LOW_HIGH' : 'LOW_LOW');
  const classification = position === 'HIGH_HIGH' ? 'QUICK_WIN_CANDIDATE' : position === 'HIGH_LOW' ? 'STRATEGIC_BET_CANDIDATE' : position === 'LOW_HIGH' ? 'SELECTIVE_OPPORTUNITY' : 'LOWER_PRIORITY_CANDIDATE';
  const reason = highValue && highFeasibility ? `Business Value and Automation Feasibility are both at or above the ${OPPORTUNITY_MATRIX_CONFIG.businessValueHigh}-point matrix threshold.` : `Business Value is ${highValue ? 'at or above' : 'below'} ${OPPORTUNITY_MATRIX_CONFIG.businessValueHigh} and Automation Feasibility is ${highFeasibility ? 'at or above' : 'below'} ${OPPORTUNITY_MATRIX_CONFIG.feasibilityHigh}.`;
  return result(classification, position, reason);
}

function result(classification: MatrixClassification, matrixPosition: MatrixDecision['matrixPosition'], reason: string): MatrixDecision { return { matrixPosition, classification, label: labels[classification], reason, decisionReady: classification.endsWith('CANDIDATE') || classification === 'SELECTIVE_OPPORTUNITY' }; }
function format(value: number | null) { return value === null ? 'unknown' : Number.isInteger(value) ? String(value) : value.toFixed(2); }
