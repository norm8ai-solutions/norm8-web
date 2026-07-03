/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailButton.tsx
 * Description: Email-safe blue CTA button.
 * ------------------------------------------------------------------
 */

type EmailButtonProps = {
  href: string;
  children: string;
};

export default function EmailButton({ children, href }: EmailButtonProps) {
  return (
    <a
      href={href}
      style={{
        backgroundColor: '#2563EB',
        borderRadius: 10,
        color: '#ffffff',
        display: 'inline-block',
        fontSize: 14,
        fontWeight: 800,
        padding: '13px 20px',
        textDecoration: 'none',
      }}
    >
      {children}
    </a>
  );
}
