/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailShell.tsx
 * Description: Shared dark premium shell for Norm8 emails.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';

type EmailShellProps = {
  children: ReactNode;
  maxWidth?: number;
};

export default function EmailShell({ children, maxWidth = 680 }: EmailShellProps) {
  return (
    <div
      style={{
        backgroundColor: '#060B14',
        color: '#E8EDF8',
        fontFamily: 'Arial, sans-serif',
        padding: '28px 14px',
      }}
    >
      <div
        style={{
          backgroundColor: '#0A1120',
          border: '1px solid #182034',
          borderRadius: 16,
          margin: '0 auto',
          maxWidth,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
