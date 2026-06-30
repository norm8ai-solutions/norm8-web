import type { Metadata } from 'next';

import './globals.css';
import SiteChrome from '@/components/layout/SiteChrome';

export const metadata: Metadata = {
  title: 'Norm8 — Sistemas de IA',
  description:
    'Desenvolvemos sistemas de Inteligência Artificial que automatizam, otimizam e escalam negócios reais.',
  icons: {
    icon: '/favicon.png',
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-[#060B14] text-[#E8EDF8]">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
