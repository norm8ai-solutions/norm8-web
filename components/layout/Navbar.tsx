'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const N8_BLUE = '#2563EB';
const BG = '#060B14';
const BORDER = '#182034';

const navLinks = [
  { label: 'Soluções', href: '#solucoes' },
  { label: 'Produtos', href: '#produtos' },
  { label: 'Como Funciona', href: '#como-funciona' },
  { label: 'Auditoria', page: '/auditoria' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    handler();

    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToSection = (selector: string) => {
    setTimeout(() => {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  const handleNav = (link: { label: string; href?: string; page?: string }) => {
    setOpen(false);

    if (link.page) {
      router.push(link.page);
      return;
    }

    if (link.href?.startsWith('#')) {
      if (pathname !== '/') {
        router.push('/');
        scrollToSection(link.href);
      } else {
        scrollToSection(link.href);
      }
    }
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
          backgroundColor: scrolled ? 'rgba(6,11,20,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png"
              alt="Norm8"
              style={{ height: 32, width: 'auto' }}
            />
          </Link>

          <div
            className="hidden-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8399B8',
                  padding: '8px 14px',
                  borderRadius: 8,
                  transition: 'color 0.2s',
                  fontSize: 14,
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E8EDF8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8399B8';
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div
            className="hidden-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Link href="/marcar-reuniao" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8399B8',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E8EDF8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8399B8';
                }}
              >
                Marcar Reunião
              </button>
            </Link>

            <Link href="/auditoria" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  backgroundColor: N8_BLUE,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Obter Auditoria <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="show-mobile"
            style={{
              background: 'none',
              border: 'none',
              color: '#E8EDF8',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
              backgroundColor: BG,
              paddingTop: 80,
              paddingLeft: 24,
              paddingRight: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E8EDF8',
                  cursor: 'pointer',
                  fontSize: 22,
                  fontWeight: 600,
                  textAlign: 'left',
                  padding: '12px 0',
                }}
              >
                {link.label}
              </button>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <Link href="/marcar-reuniao" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
                <button
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: 'none',
                    color: '#E8EDF8',
                    padding: '14px',
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Marcar Reunião
                </button>
              </Link>

              <Link href="/auditoria" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
                <button
                  style={{
                    backgroundColor: N8_BLUE,
                    border: 'none',
                    color: '#fff',
                    padding: '14px',
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Obter Auditoria
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @media (max-width: 768px) {
          .hidden-mobile {
            display: none !important;
          }

          .show-mobile {
            display: flex !important;
          }
        }

        @media (min-width: 769px) {
          .hidden-mobile {
            display: flex !important;
          }

          .show-mobile {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}