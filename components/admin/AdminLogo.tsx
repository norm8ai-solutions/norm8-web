/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminLogo.tsx
 * Description: Shared Norm8 brand lockup for internal admin surfaces.
 * Responsibilities:
 * - Reuse the official Norm8 website logo asset without recreating it.
 * - Keep admin branding aligned with the public landing page.
 * - Provide compact and expanded variants for the Admin sidebar.
 * ------------------------------------------------------------------
 */

import Image from 'next/image';

const norm8LogoUrl = '/brand/norm8-logo.png';

type AdminLogoProps = {
  caption?: string;
  compact?: boolean;
};

/**
 * Renders the official Norm8 logo with compact and expanded variants.
 *
 * @param props Logo variant and optional caption.
 * @returns Norm8 admin brand lockup.
 */
export default function AdminLogo({ caption = 'Internal', compact = false }: AdminLogoProps) {
  return (
    <div
      aria-label={compact ? 'Norm8' : `Norm8 ${caption}`}
      className={`admin-logo-lockup${compact ? ' admin-logo-lockup-compact' : ''}`}
    >
      <span className="admin-logo-visual" aria-hidden="true">
        <Image
          alt=""
          className="admin-logo-image"
          height={28}
          priority
          src={norm8LogoUrl}
          width={118}
        />
        <span className="admin-logo-symbol">
          <Image
            alt=""
            className="admin-logo-symbol-image"
            height={32}
            priority
            src={norm8LogoUrl}
            width={124}
          />
        </span>
      </span>
      <span aria-hidden={compact} className="admin-logo-caption">
        {caption}
      </span>
    </div>
  );
}
