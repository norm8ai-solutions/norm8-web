/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailBadge.tsx
 * Description: Compact status badge for Norm8 emails.
 * ------------------------------------------------------------------
 */

type EmailBadgeProps = {
  children: string;
};

export default function EmailBadge({ children }: EmailBadgeProps) {
  return (
    <span
      style={{
        backgroundColor: '#2563EB',
        borderRadius: 999,
        color: '#ffffff',
        display: 'inline-block',
        fontSize: 13,
        fontWeight: 800,
        padding: '7px 12px',
      }}
    >
      {children}
    </span>
  );
}
