export type PilotEconomicsInputs = {
  laborCostPerHourCents: number | null;
  timeBaselineHours: number | null;
  timeActualHours: number | null;
  directMonthlySavingsCents: number | null;
  otherMonthlySavingsCents: number | null;
  ongoingMonthlyCostCents: number | null;
  investmentCostCents: number | null;
  currency?: string;
};

export type PilotEconomicsCalculation = {
  laborSavingsCents: number | null;
  grossMonthlySavingsCents: number | null;
  netMonthlySavingsCents: number | null;
  annualizedNetSavingsCents: number | null;
  paybackMonths: number | null;
  twelveMonthRoiPercent: number | null;
  incomplete: boolean;
  unknown: string[];
};

export function calculatePilotEconomics(input: PilotEconomicsInputs): PilotEconomicsCalculation {
  const unknown: string[] = [];
  const laborKnown = input.laborCostPerHourCents !== null && input.timeBaselineHours !== null && input.timeActualHours !== null;
  if (!laborKnown) unknown.push('labor savings');
  const directKnown = input.directMonthlySavingsCents !== null;
  if (!directKnown) unknown.push('direct monthly savings');
  const otherKnown = input.otherMonthlySavingsCents !== null;
  if (!otherKnown) unknown.push('other monthly savings');
  const ongoingKnown = input.ongoingMonthlyCostCents !== null;
  if (!ongoingKnown) unknown.push('ongoing monthly cost');

  const laborSavingsCents = laborKnown
    ? Math.round((input.timeBaselineHours! - input.timeActualHours!) * input.laborCostPerHourCents!)
    : null;
  const grossMonthlySavingsCents = laborKnown && directKnown && otherKnown
    ? laborSavingsCents! + input.directMonthlySavingsCents! + input.otherMonthlySavingsCents!
    : null;
  const netMonthlySavingsCents = grossMonthlySavingsCents !== null && ongoingKnown
    ? grossMonthlySavingsCents - input.ongoingMonthlyCostCents!
    : null;
  const annualizedNetSavingsCents = netMonthlySavingsCents === null ? null : netMonthlySavingsCents * 12;
  const paybackMonths = input.investmentCostCents !== null && netMonthlySavingsCents !== null && netMonthlySavingsCents > 0
    ? input.investmentCostCents === 0 ? 0 : input.investmentCostCents / netMonthlySavingsCents
    : null;
  const twelveMonthRoiPercent = input.investmentCostCents !== null && input.investmentCostCents > 0 && annualizedNetSavingsCents !== null
    ? ((annualizedNetSavingsCents - input.investmentCostCents) / input.investmentCostCents) * 100
    : null;
  if (input.investmentCostCents === null) unknown.push('investment cost');
  return { laborSavingsCents, grossMonthlySavingsCents, netMonthlySavingsCents, annualizedNetSavingsCents, paybackMonths, twelveMonthRoiPercent, incomplete: unknown.length > 0, unknown };
}

export function formatMoneyCents(value: number | null, currency = 'EUR') {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
}
