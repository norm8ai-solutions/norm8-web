/**
 * ------------------------------------------------------------------
 * File: lib/admin/chart-types.ts
 * Description: Shared serializable chart types for admin UI components.
 * Responsibilities:
 * - Keep chart data contracts reusable across server queries and client charts.
 * - Avoid importing server-only modules from client components.
 * ------------------------------------------------------------------
 */

export type AdminSubmissionChartPoint = {
  date: string;
  label: string;
  tooltipLabel: string;
  submissions: number;
};
