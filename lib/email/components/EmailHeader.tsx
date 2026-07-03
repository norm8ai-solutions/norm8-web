/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailHeader.tsx
 * Description: Branded header/capa for Norm8 transactional emails.
 * ------------------------------------------------------------------
 */

import type { ReactNode } from 'react';
import EmailLogo from './EmailLogo';

type EmailHeaderProps = {
  label: string;
  title: string;
  description?: string;
  meta?: Array<{ label: string; value: string }>;
  children?: ReactNode;
};

export default function EmailHeader({
  children,
  description,
  label,
  meta = [],
  title,
}: EmailHeaderProps) {
  return (
    <>
      <div style={{ padding: '24px 30px 12px' }}>
        <EmailLogo />
      </div>
      <div
        style={{
          backgroundColor: '#0D1526',
          borderTop: '1px solid #182034',
          padding: '32px 30px',
        }}
      >
        <p
          style={{
            color: '#2563EB',
            fontSize: 12,
            fontWeight: 800,
            margin: '0 0 10px',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
        <h1 style={{ color: '#E8EDF8', fontSize: 28, lineHeight: 1.22, margin: '0 0 14px' }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: '#8399B8', fontSize: 15, lineHeight: 1.7, margin: '0 0 18px' }}>
            {description}
          </p>
        )}
        {meta.length > 0 && (
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
            <tbody>
              <tr>
                {meta.map((item) => (
                  <td
                    key={item.label}
                    style={{
                      color: '#8399B8',
                      fontSize: 12,
                      padding: '0 16px 0 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </td>
                ))}
              </tr>
              <tr>
                {meta.map((item) => (
                  <td
                    key={item.label}
                    style={{
                      color: '#E8EDF8',
                      fontSize: 15,
                      fontWeight: 700,
                      padding: '4px 16px 0 0',
                    }}
                  >
                    {item.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
        {children}
      </div>
    </>
  );
}
