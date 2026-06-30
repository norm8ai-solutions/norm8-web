/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminLogo.tsx
 * Description: Shared Norm8 brand lockup for internal admin surfaces.
 * Responsibilities:
 * - Reuse the official Norm8 website logo asset without recreating it.
 * - Keep admin branding aligned with the public landing page.
 * - Provide a compact secondary label for internal product context.
 * ------------------------------------------------------------------
 */

import Image from 'next/image';

const norm8LogoUrl =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png';

type AdminLogoProps = {
  caption?: string;
};

/**
 * Renders the official Norm8 logo with an optional internal caption.
 *
 * @param props Optional caption displayed below the logo.
 * @returns Norm8 admin brand lockup.
 */
export default function AdminLogo({ caption = 'Internal' }: AdminLogoProps) {
  return (
    <div className="admin-logo-lockup">
      <Image
        alt="Norm8"
        className="admin-logo-image"
        height={28}
        priority
        src={norm8LogoUrl}
        width={118}
      />
      <span className="admin-logo-caption">{caption}</span>
    </div>
  );
}
