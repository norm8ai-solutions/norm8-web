/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailCard.tsx
 * Description: Reusable dark card for email content blocks.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';

type EmailCardProps = {
  children: ReactNode;
  compact?: boolean;
};

export default function EmailCard({ children, compact = false }: EmailCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#0D1526',
        border: '1px solid #182034',
        borderRadius: 12,
        marginBottom: compact ? 10 : 14,
        padding: compact ? 14 : 16,
      }}
    >
      {children}
    </div>
  );
}
