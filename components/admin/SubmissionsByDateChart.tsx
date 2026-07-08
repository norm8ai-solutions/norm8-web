/**
 * ------------------------------------------------------------------
 * File: components/admin/SubmissionsByDateChart.tsx
 * Description: Daily submissions chart for the Norm8 admin overview.
 * Responsibilities:
 * - Render the last 30 days of submission activity.
 * - Keep the chart responsive and aligned with the admin dark theme.
 * - Provide a custom tooltip with Portuguese labels.
 * ------------------------------------------------------------------
 */

'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminSubmissionChartPoint } from '@/lib/admin/chart-types';

const SUBMISSIONS_LABEL = 'Submiss\u00f5es';
const EMPTY_MESSAGE = 'Ainda n\u00e3o existem submiss\u00f5es neste per\u00edodo.';
const SINGULAR_SUBMISSION_LABEL = 'submiss\u00e3o';
const PLURAL_SUBMISSION_LABEL = 'submiss\u00f5es';

type SubmissionsByDateChartProps = {
  data: AdminSubmissionChartPoint[];
};

type TooltipPayload = {
  payload: AdminSubmissionChartPoint;
  value: number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
};

/**
 * Renders the submissions-by-date chart.
 *
 * @param props Chart data points.
 * @returns Responsive chart or empty state.
 */
export function SubmissionsByDateChart({ data }: SubmissionsByDateChartProps) {
  const totalSubmissions = data.reduce((total, point) => total + point.submissions, 0);

  if (totalSubmissions === 0) {
    return <div className="admin-chart-empty">{EMPTY_MESSAGE}</div>;
  }

  return (
    <div className="admin-chart-shell">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ bottom: 0, left: 4, right: 8, top: 10 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.11)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval={4}
            minTickGap={10}
            tick={{ fill: 'rgba(143, 162, 196, 0.78)', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: 'rgba(143, 162, 196, 0.72)', fontSize: 11 }}
            tickLine={false}
            tickMargin={8}
            width={48}
          />
          <Tooltip
            content={<SubmissionsChartTooltip />}
            cursor={{ fill: 'rgba(96, 165, 250, 0.08)' }}
          />
          <Bar
            dataKey="submissions"
            fill="url(#admin-submissions-gradient)"
            maxBarSize={26}
            name={SUBMISSIONS_LABEL}
            radius={[6, 6, 2, 2]}
          />
          <defs>
            <linearGradient id="admin-submissions-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.96} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.62} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SubmissionsChartTooltip({ active, payload }: ChartTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="admin-chart-tooltip">
      <span>{point.tooltipLabel}</span>
      <strong>
        {point.submissions}{' '}
        {point.submissions === 1 ? SINGULAR_SUBMISSION_LABEL : PLURAL_SUBMISSION_LABEL}
      </strong>
    </div>
  );
}