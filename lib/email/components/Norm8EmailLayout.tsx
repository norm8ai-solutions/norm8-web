/**
 * ------------------------------------------------------------------
 * File: lib/email/components/Norm8EmailLayout.tsx
 * Description: Shared branded layout for Norm8 transactional emails.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';
import EmailFooter from './EmailFooter';
import EmailHeader from './EmailHeader';
import EmailShell from './EmailShell';

export type Norm8EmailLayoutProps = {
  badge: string;
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
  footerText?: string;
  children: ReactNode;
};

export const NORM8_EMAIL_FOOTER_TEXT =
  'Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis.';

export default function Norm8EmailLayout({
  badge,
  children,
  footerText = NORM8_EMAIL_FOOTER_TEXT,
  meta,
  subtitle,
  title,
}: Norm8EmailLayoutProps) {
  return (
    <EmailShell>
      <EmailHeader description={subtitle} label={badge} meta={meta} title={title} />
      {children}
      <EmailFooter text={footerText} />
    </EmailShell>
  );
}
