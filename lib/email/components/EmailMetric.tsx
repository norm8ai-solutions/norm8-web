/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailMetric.tsx
 * Description: Label/value block for email-safe metric grids.
 * ------------------------------------------------------------------
 */

type EmailMetricProps = {
  label: string;
  value: string;
};

export default function EmailMetric({ label, value }: EmailMetricProps) {
  return (
    <td style={{ padding: '0 12px 12px 0', verticalAlign: 'top', width: '50%' }}>
      <div style={{ backgroundColor: '#0D1526', border: '1px solid #182034', borderRadius: 12, padding: 14 }}>
        <p style={{ color: '#8399B8', fontSize: 11, fontWeight: 800, margin: '0 0 5px', textTransform: 'uppercase' }}>
          {label}
        </p>
        <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          {value}
        </p>
      </div>
    </td>
  );
}
