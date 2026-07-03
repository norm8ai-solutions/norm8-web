/**
 * ------------------------------------------------------------------
 * File: lib/email/components/EmailLogo.tsx
 * Description: Norm8 logo component for transactional emails.
 * ------------------------------------------------------------------
 */

const DEFAULT_LOGO_URL =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png';

type EmailLogoProps = {
  width?: number;
};

export function getEmailLogoUrl(): string {
  return process.env.NEXT_PUBLIC_NORM8_LOGO_URL || DEFAULT_LOGO_URL;
}

export default function EmailLogo({ width = 136 }: EmailLogoProps) {
  const logoUrl = getEmailLogoUrl();

  if (!logoUrl) {
    return (
      <p style={{ color: '#E8EDF8', fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>
        Norm8
      </p>
    );
  }

  return (
    <img
      alt="Norm8"
      src={logoUrl}
      style={{ display: 'block', height: 'auto', maxWidth: width, width }}
    />
  );
}
