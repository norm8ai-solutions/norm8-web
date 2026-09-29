export const AUTOMATION_SCORE_KEY = 'automation-opportunity';
export const AUTOMATION_SCORE_VERSION = 2;

export const criterionKeys = [
  'frequency', 'timeBurden', 'costBurden', 'roiPotential',
  'repeatability', 'dataReadiness', 'integrationFeasibility', 'riskManageability',
  'willingnessToPay', 'crossCompanyRepeatability', 'businessImportance',
] as const;

export type CriterionKey = (typeof criterionKeys)[number];
export type EvidenceQualityValue = 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
export type CriterionObservation = {
  value: number | null;
  evidenceQuality: EvidenceQualityValue;
  source?: string | null;
  reference?: string | null;
  note?: string | null;
  capturedAt?: string | null;
};
export type AutomationAssessment = Record<CriterionKey, CriterionObservation>;
export type ScoringModelConfig = {
  scale: { min: number; max: number };
  dimensions: Record<string, { weight: number; criteria: Partial<Record<CriterionKey, number>> }>;
};

export const automationScoreConfig: ScoringModelConfig = {
  scale: { min: 1, max: 5 },
  dimensions: {
    businessValue: { weight: 0.35, criteria: { frequency: 0.25, timeBurden: 0.25, costBurden: 0.2, roiPotential: 0.3 } },
    feasibility: {
      weight: 0.35,
      criteria: {
        repeatability: 0.3, dataReadiness: 0.25, integrationFeasibility: 0.25,
        // 5 means failures are low-consequence/manageable; 1 means dangerous or hard to control.
        riskManageability: 0.2,
      },
    },
    marketPotential: { weight: 0.3, criteria: { willingnessToPay: 0.4, crossCompanyRepeatability: 0.35, businessImportance: 0.25 } },
  },
};

export const dimensionMetadata = {
  businessValue: { label: 'Business Value' },
  feasibility: { label: 'Automation Feasibility' },
  marketPotential: { label: 'Commercial / Market Potential' },
} as const;
export const dimensionOrder = ['businessValue','feasibility','marketPotential'] as const;

export const criterionMetadata: Record<CriterionKey,{label:string;anchor:string}> = {
  frequency:{label:'Frequency',anchor:'1 = rare · 5 = very frequent'},
  timeBurden:{label:'Time burden',anchor:'1 = minimal human time · 5 = very high human time'},
  costBurden:{label:'Cost burden',anchor:'1 = low cost burden · 5 = very high cost burden'},
  roiPotential:{label:'ROI potential',anchor:'1 = limited recoverable value · 5 = very high recoverable value'},
  repeatability:{label:'Repeatability',anchor:'1 = highly variable · 5 = highly repeatable'},
  dataReadiness:{label:'Data readiness',anchor:'1 = poor data readiness · 5 = strong data readiness'},
  integrationFeasibility:{label:'Integration feasibility',anchor:'1 = very difficult · 5 = straightforward'},
  riskManageability:{label:'Risk manageability',anchor:'1 = dangerous / hard to control · 5 = low consequence / easily controlled'},
  willingnessToPay:{label:'Willingness to pay',anchor:'1 = little evidence · 5 = strong willingness to pay'},
  crossCompanyRepeatability:{label:'Cross-company repeatability',anchor:'1 = company-specific · 5 = observed / expected across many companies'},
  businessImportance:{label:'Business importance',anchor:'1 = low importance · 5 = highly important operationally'},
};

export function isCriterionKey(value:string):value is CriterionKey{return (criterionKeys as readonly string[]).includes(value)}

export function assertValidScoringInputs(config:ScoringModelConfig,assessment:AutomationAssessment){
  if(!config||typeof config!=='object'||!config.scale||!Number.isFinite(config.scale.min)||!Number.isFinite(config.scale.max)||config.scale.max<=config.scale.min)throw new Error('SCORING_CONFIG_INVALID');
  if(!config.dimensions||typeof config.dimensions!=='object'||!Object.keys(config.dimensions).length)throw new Error('SCORING_CONFIG_INVALID');
  for(const dimension of Object.values(config.dimensions)){
    if(!Number.isFinite(dimension.weight)||dimension.weight<=0||!dimension.criteria||!Object.keys(dimension.criteria).length)throw new Error('SCORING_CONFIG_INVALID');
    for(const [key,weight] of Object.entries(dimension.criteria)){if(!isCriterionKey(key)||!Number.isFinite(weight)||Number(weight)<=0)throw new Error('SCORING_CONFIG_INVALID')}
  }
  if(!assessment||typeof assessment!=='object')throw new Error('ASSESSMENT_INVALID');
  for(const key of criterionKeys){const item=assessment[key];if(!item||typeof item!=='object')throw new Error('ASSESSMENT_INVALID');if(item.value!==null&&(!Number.isFinite(item.value)||item.value<config.scale.min||item.value>config.scale.max))throw new Error('ASSESSMENT_INVALID');if(!['UNKNOWN','ESTIMATED','MEASURED'].includes(item.evidenceQuality))throw new Error('ASSESSMENT_INVALID');if(item.capturedAt&&Number.isNaN(Date.parse(item.capturedAt)))throw new Error('ASSESSMENT_INVALID')}
}

export type CriterionBreakdown = CriterionObservation & {
  configuredWeight: number;
  normalizedWeight: number | null;
  scoreContribution: number | null;
};
export type DimensionBreakdown = {
  score: number | null;
  coverage: number;
  knownCriteria: CriterionKey[];
  unknownCriteria: CriterionKey[];
  criteria: Partial<Record<CriterionKey, CriterionBreakdown>>;
};

export function calculateAutomationScore(config: ScoringModelConfig, assessment: AutomationAssessment) {
  const dimensions = Object.fromEntries(Object.entries(config.dimensions).map(([key, dimension]) => [
    key, calculateDimension(config, assessment, dimension.criteria),
  ])) as Record<string, DimensionBreakdown>;
  const knownDimensions = Object.entries(config.dimensions).filter(([key]) => dimensions[key]?.score !== null);
  const knownDimensionWeight = knownDimensions.reduce((sum, [, dimension]) => sum + dimension.weight, 0);
  const opportunityScore = knownDimensionWeight === 0 ? null : round(knownDimensions.reduce((sum, [key, dimension]) => {
    return sum + (dimensions[key].score ?? 0) * (dimension.weight / knownDimensionWeight);
  }, 0));
  const evidence = criterionKeys.map((key) => effectiveEvidence(assessment[key]));
  const confidenceScore = round(evidence.reduce((sum, quality) => sum + evidenceWeight(quality), 0) / evidence.length * 100);

  return {
    opportunityScore,
    confidenceScore,
    evidenceConfidence: confidenceScore >= 75 ? 'HIGH' : confidenceScore >= 45 ? 'MEDIUM' : 'LOW',
    dimensions,
    coverage: round(criterionKeys.filter((key) => isKnown(assessment[key])).length / criterionKeys.length * 100),
  } as const;
}

function calculateDimension(config: ScoringModelConfig, assessment: AutomationAssessment, weights: Partial<Record<CriterionKey, number>>): DimensionBreakdown {
  const entries = Object.entries(weights) as Array<[CriterionKey, number]>;
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const knownEntries = entries.filter(([key]) => isKnown(assessment[key]));
  const knownWeight = knownEntries.reduce((sum, [, weight]) => sum + weight, 0);
  const criteria: DimensionBreakdown['criteria'] = {};

  for (const [key, configuredWeight] of entries) {
    const observation = assessment[key];
    const known = isKnown(observation);
    const normalizedWeight = known && knownWeight > 0 ? configuredWeight / knownWeight : null;
    criteria[key] = {
      ...observation,
      configuredWeight,
      normalizedWeight,
      scoreContribution: known && normalizedWeight !== null ? round(normalizeScore(observation.value as number, config.scale) * normalizedWeight) : null,
    };
  }

  return {
    score: knownWeight === 0 ? null : round(knownEntries.reduce((sum, [key, weight]) => {
      return sum + normalizeScore(assessment[key].value as number, config.scale) * (weight / knownWeight);
    }, 0)),
    coverage: totalWeight === 0 ? 0 : round(knownWeight / totalWeight * 100),
    knownCriteria: knownEntries.map(([key]) => key),
    unknownCriteria: entries.filter(([key]) => !isKnown(assessment[key])).map(([key]) => key),
    criteria,
  };
}

function isKnown(observation: CriterionObservation | undefined): boolean {
  return Boolean(observation && observation.value !== null && Number.isFinite(observation.value));
}
function effectiveEvidence(observation: CriterionObservation | undefined): EvidenceQualityValue {
  return isKnown(observation) ? observation?.evidenceQuality ?? 'UNKNOWN' : 'UNKNOWN';
}
function evidenceWeight(quality: EvidenceQualityValue): number {
  if (quality === 'MEASURED') return 1;
  if (quality === 'ESTIMATED') return 0.55;
  return 0;
}
function normalizeScore(value: number, scale: ScoringModelConfig['scale']): number {
  const bounded = Math.min(scale.max, Math.max(scale.min, value));
  return ((bounded - scale.min) / (scale.max - scale.min)) * 100;
}
function round(value: number): number { return Math.round(value * 10) / 10; }
