'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const BORDER = '#182034';
const MUTED = '#8399B8';
const BLUE = '#2563EB';

type FooterLink = {
  label: string;
  href?: `#${string}`;
  page?: string;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const sections: FooterSection[] = [
  {
    title: 'Explorar',
    links: [
      { label: 'Soluções', href: '#solucoes' },
      { label: 'Produtos', href: '#produtos' },
      { label: 'Como Funciona', href: '#como-funciona' },
      { label: 'Segurança', href: '#contacto' },
    ],
  },
  {
    title: 'Ação',
    links: [
      { label: 'Auditoria Inteligente', page: '/auditoria' },
      { label: 'Automação Personalizada', href: '#automacao' },
      { label: 'Marcar Reunião', page: '/marcar-reuniao' },
    ],
  },
];

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();

  const scrollToSection = (href: string) => {
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({
        behavior: 'smooth',
      });
    }, 100);
  };

  const handleLink = (link: FooterLink): void => {
    if (link.page) {
      router.push(link.page);
      return;
    }

    if (link.href?.startsWith('#')) {
      if (pathname !== '/') {
        router.push('/');
        scrollToSection(link.href);
      } else {
        document.querySelector(link.href)?.scrollIntoView({
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <footer
      style={{
        backgroundColor: '#060B14',
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '56px 24px 32px',
        }}
      >
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <Link href="/">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png"
                alt="Norm8"
                style={{
                  height: 26,
                  marginBottom: 16,
                  display: 'block',
                }}
              />
            </Link>

            <p
              style={{
                fontSize: 14,
                color: MUTED,
                lineHeight: 1.65,
                maxWidth: 300,
              }}
            >
              Sistemas de IA e automação que reduzem trabalho manual e melhoram
              operações.
            </p>

            <a
              href="mailto:contacto@norm8.ai"
              style={{
                display: 'inline-block',
                marginTop: 16,
                fontSize: 14,
                color: BLUE,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              contacto@norm8.ai
            </a>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#E8EDF8',
                  marginBottom: 20,
                }}
              >
                {section.title}
              </h4>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {section.links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => handleLink(link)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: MUTED,
                        padding: 0,
                        transition: 'color 0.2s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.color = '#E8EDF8';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.color = MUTED;
                      }}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: MUTED }}>
            © 2026 Norm8. Todos os direitos reservados.
          </p>

          <div style={{ display: 'flex', gap: 24 }}>
            {['Política de Privacidade', 'Termos de Serviço'].map((label) => (
              <a
                key={label}
                href="#"
                style={{
                  fontSize: 13,
                  color: MUTED,
                  textDecoration: 'none',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = '#E8EDF8';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = MUTED;
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}