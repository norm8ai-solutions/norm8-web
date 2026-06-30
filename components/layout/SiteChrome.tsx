/**
 * ------------------------------------------------------------------
 * File: components/layout/SiteChrome.tsx
 * Description: Public website chrome wrapper for Norm8 pages.
 * Responsibilities:
 * - Render Navbar and Footer on public website routes.
 * - Hide public chrome inside the internal /admin dashboard.
 * - Keep RootLayout simple while preserving App Router route awareness.
 * ------------------------------------------------------------------
 */

'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

type SiteChromeProps = {
  children: ReactNode;
};

/**
 * Renders public website chrome unless the current route is internal admin.
 *
 * @param props Page content.
 * @returns Route-aware shell.
 */
export default function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
