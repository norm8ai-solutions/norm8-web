export type FinancePeriodKey = 'month' | 'last30' | 'quarter' | 'year' | 'all';

export const financePeriodOptions: Array<{ label: string; value: FinancePeriodKey }> = [
  { label: 'Este m\u00eas', value: 'month' },
  { label: '\u00daltimos 30 dias', value: 'last30' },
  { label: 'Este trimestre', value: 'quarter' },
  { label: 'Este ano', value: 'year' },
  { label: 'Todo o per\u00edodo', value: 'all' },
];
