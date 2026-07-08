/**
 * ------------------------------------------------------------------
 * File: lib/admin/metrics.ts
 * Description: Shared helpers for admin metric trends.
 * Responsibilities:
 * - Calculate safe percentage changes between equivalent periods.
 * - Format KPI trend labels without leaking NaN or Infinity to the UI.
 * - Keep overview cards consistent without duplicating metric logic.
 * ------------------------------------------------------------------
 */

export type AdminMetricTrendTone = 'positive' | 'negative' | 'neutral' | 'new';

export type AdminMetricTrend = {
  label: string;
  tone: AdminMetricTrendTone;
  value: number | null;
};

type MetricTrendOptions = {
  inverseTone?: boolean;
};

/**
 * Calculates the percentage change between two values.
 *
 * @param current Current period value.
 * @param previous Previous equivalent period value.
 * @returns Rounded percentage change, or null when there is no baseline.
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? null : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Builds a formatted trend object for KPI cards.
 *
 * @param current Current period value.
 * @param previous Previous equivalent period value.
 * @param options Optional inverse tone for metrics where growth is bad.
 * @returns Label, tone and raw percentage value.
 */
export function getMetricTrend(
  current: number,
  previous: number,
  options: MetricTrendOptions = {},
): AdminMetricTrend {
  const value = calculatePercentageChange(current, previous);
  if (value === null) {
    return {
      label: 'Novo',
      tone: options.inverseTone ? 'negative' : 'new',
      value,
    };
  }

  const label = value > 0 ? `+${value}%` : `${value}%`;
  const directionTone: AdminMetricTrendTone =
    value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';

  if (!options.inverseTone || directionTone === 'neutral') {
    return { label, tone: directionTone, value };
  }

  return {
    label,
    tone: directionTone === 'positive' ? 'negative' : 'positive',
    value,
  };
}
