/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailSection.tsx
 * Description: Shared content section for Norm8 emails.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';

type EmailSectionProps = {
  children: ReactNode;
  title?: string;
  align?: 'left' | 'center';
};

export default function EmailSection({ align = 'left', children, title }: EmailSectionProps) {
  return (
    <div style={{ borderTop: '1px solid #182034', padding: '26px 30px', textAlign: align }}>
      {title && (
        <p style={{ color: '#E8EDF8', fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
