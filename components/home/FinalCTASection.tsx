'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const BORDER = '#182034';
const MUTED = '#8399B8';

type SectionId = `#${string}`;

export default function FinalCTASection() {
  const router = useRouter();

  const scrollToSection = (id: SectionId): void => {
    document.querySelector(id)?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <section
      style={{
        backgroundColor: '#060B14',
        padding: '100px 0',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: '72px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              height: 300,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 800,
                color: '#E8EDF8',
                letterSpacing: '-0.02em',
                marginBottom: 16,
                lineHeight: 1.15,
              }}
            >
              Descubra onde a sua empresa
              <br />
              pode <span style={{ color: BLUE }}>automatizar mais.</span>
            </h2>

            <p
              style={{
                fontSize: 18,
                color: MUTED,
                maxWidth: 520,
                margin: '0 auto 40px',
              }}
            >
              Receba uma análise inicial das suas operações ou descreva o desafio
              específico que pretende resolver.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Primary */}
              <button
                type="button"
                onClick={() => router.push('/auditoria')}
                style={{
                  backgroundColor: BLUE,
                  color: '#fff',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
                  width: '100%',
                  maxWidth: 380,
                  justifyContent: 'center',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = '1';
                }}
              >
                Obter Auditoria Inteligente <ArrowRight size={16} />
              </button>

              {/* Secondary */}
              <button
                type="button"
                onClick={() => scrollToSection('#automacao')}
                style={{
                  backgroundColor: 'rgba(37,99,235,0.1)',
                  border: '1px solid rgba(37,99,235,0.35)',
                  color: '#E8EDF8',
                  padding: '14px 32px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.2s',
                  width: '100%',
                  maxWidth: 380,
                  justifyContent: 'center',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor =
                    'rgba(37,99,235,0.18)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor =
                    'rgba(37,99,235,0.1)';
                }}
              >
                Solicitar Automação Personalizada
              </button>

              {/* Tertiary */}
              <button
                type="button"
                onClick={() => router.push('/marcar-reuniao')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = '#E8EDF8';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = MUTED;
                }}
              >
                <Calendar size={14} /> Marcar Reunião
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}