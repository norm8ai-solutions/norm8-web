/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailFooter.tsx
 * Description: Shared Norm8 email footer.
 * ------------------------------------------------------------------
 */

type EmailFooterProps = {
  text?: string;
};

export default function EmailFooter({
  text = 'Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis.',
}: EmailFooterProps) {
  return (
    <div style={{ backgroundColor: '#060B14', padding: '20px 30px' }}>
      <p style={{ color: '#8399B8', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}
