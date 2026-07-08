/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminPrimitives.tsx
 * Description: Reusable presentation primitives for Norm8 admin pages.
 * Responsibilities:
 * - Provide consistent panels, KPI cards, tables, fields, and empty states.
 * - Keep dashboard pages focused on data selection and business context.
 * - Make future internal tools inherit the same enterprise visual language.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';
import type { AdminMetricTrend } from '@/lib/admin/metrics';

type AdminPanelProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

type AdminStatCardProps = {
  icon: ReactNode;
  label: string;
  value: number | string;
  context: string;
  trend?: AdminMetricTrend;
};

type AdminTableProps = {
  headers: string[];
  children: ReactNode;
};

type AdminFieldProps = {
  label: string;
  value?: ReactNode;
};

type AdminRowProps = {
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
};

/**
 * Renders a reusable admin panel with optional title and action slot.
 *
 * @param props Panel title, subtitle, action, and body.
 * @returns Admin panel container.
 */
export function AdminPanel({ title, subtitle, action, children }: AdminPanelProps) {
  return (
    <section className="admin-panel">
      {(title || subtitle || action) && (
        <div className="admin-panel-header">
          <div>
            {title && <h2 className="admin-panel-title">{title}</h2>}
            {subtitle && <p className="admin-panel-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

/**
 * Renders an operational KPI card used on the overview dashboard.
 *
 * @param props Icon, label, value, and contextual microcopy.
 * @returns KPI card.
 */
export function AdminStatCard({
  icon,
  label,
  value,
  context,
  trend,
}: AdminStatCardProps) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <div className="admin-stat-icon">{icon}</div>
        {trend && (
          <span className={`admin-stat-trend admin-stat-trend-${trend.tone}`}>
            {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-value">{value}</p>
      </div>
      <p className="admin-stat-context">{context}</p>
    </article>
  );
}

/**
 * Renders a scroll-safe admin table with consistent headers.
 *
 * @param props Table headers and row children.
 * @returns Styled table wrapper.
 */
export function AdminTable({ headers, children }: AdminTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Renders a consistent empty state inside panels and tables.
 *
 * @param props Empty state message.
 * @returns Empty state block.
 */
export function AdminEmptyState({ children }: { children: ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}

/**
 * Renders a label/value pair for detail sidebars.
 *
 * @param props Field label and value.
 * @returns Admin field row.
 */
export function AdminField({ label, value }: AdminFieldProps) {
  return (
    <div className="admin-field">
      <span className="admin-field-label">{label}</span>
      <span className="admin-field-value">{value || '—'}</span>
    </div>
  );
}

/**
 * Renders a compact list row for dashboard panels and detail sections.
 *
 * @param props Row title, metadata, and optional body.
 * @returns List row.
 */
export function AdminRow({ title, meta, children }: AdminRowProps) {
  return (
    <div className="admin-row-item">
      <p className="admin-row-title">{title}</p>
      {meta && <p className="admin-row-meta">{meta}</p>}
      {children && <div className="admin-row-text">{children}</div>}
    </div>
  );
}
