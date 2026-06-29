'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  BarChart3,
  Users,
  Mail,
  Calendar,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const BORDER = '#182034';
const MUTED = '#8399B8';

type ModuleNode = {
  icon: LucideIcon;
  label: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  delay: number;
};

const modules: ModuleNode[] = [
  { icon: Users, label: 'Lead Gen', top: '15%', left: '12%', delay: 0 },
  { icon: Calendar, label: 'Agendamento', top: '8%', right: '18%', delay: 0.1 },
  { icon: BarChart3, label: 'Analytics', top: '50%', right: '8%', delay: 0.2 },
  { icon: Mail, label: 'Email AI', bottom: '20%', right: '18%', delay: 0.3 },
  { icon: Settings, label: 'CRM Auto', bottom: '15%', left: '12%', delay: 0.4 },
  { icon: FileText, label: 'Reporting', top: '50%', left: '5%', delay: 0.5 },
];

const tags: string[] = [
  'Automação de processos',
  'Inteligência Artificial',
  'Sistemas integrados',
];

export default function HeroSection() {
  const router = useRouter();

  const scrollToSection = (selector: string): void => {
    document.querySelector(selector)?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <section
      style={{
        backgroundColor: '#060B14',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 64,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 24px',
          width: '100%',
        }}
      >
        <div
          className="hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(37,99,235,0.1)',
                border: '1px solid rgba(37,99,235,0.25)',
                borderRadius: 20,
                padding: '6px 14px',
                marginBottom: 28,
              }}
            >
              <Zap size={13} color={BLUE} />

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: BLUE,
                  letterSpacing: '0.05em',
                }}
              >
                AUTOMAÇÃO & INTELIGÊNCIA ARTIFICIAL
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                fontWeight: 800,
                lineHeight: 1.1,
                color: '#E8EDF8',
                marginBottom: 24,
                letterSpacing: '-0.02em',
              }}
            >
              Automatize processos.
              <br />
              <span style={{ color: BLUE }}>Escale resultados.</span>
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: MUTED,
                maxWidth: 520,
                marginBottom: 40,
              }}
            >
              Ajudamos empresas a reduzir trabalho manual através de automação e
              inteligência artificial. Desenvolvemos sistemas internos e software
              para melhorar operações.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/auditoria')}
                style={{
                  backgroundColor: BLUE,
                  color: '#fff',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
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

              <button
                type="button"
                onClick={() => scrollToSection('#automacao')}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${BORDER}`,
                  color: '#E8EDF8',
                  padding: '14px 24px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = BLUE;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = BORDER;
                }}
              >
                Solicitar Automação Personalizada
              </button>
            </div>

            <p style={{ fontSize: 13, color: MUTED, marginTop: 16 }}>
              Prefere falar diretamente connosco?{' '}
              <button
                type="button"
                onClick={() => router.push('/marcar-reuniao')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: BLUE,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Marque uma reunião.
              </button>
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 48,
                flexWrap: 'wrap',
              }}
            >
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: MUTED,
                    fontWeight: 500,
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: BLUE,
                      flexShrink: 0,
                    }}
                  />
                  {tag}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              position: 'relative',
              height: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Center hub */}
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(37,99,235,0.1) 60%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png"
                alt="Norm8"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                }}
              />
            </div>

            {[160, 210, 260].map((radius, index) => (
              <div
                key={radius}
                style={{
                  position: 'absolute',
                  width: radius * 2,
                  height: radius * 2,
                  borderRadius: '50%',
                  border: `1px solid rgba(24,32,52,${0.8 - index * 0.2})`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}

            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <motion.div
                  key={module.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + module.delay,
                  }}
                  style={{
                    position: 'absolute',
                    top: module.top,
                    bottom: module.bottom,
                    left: module.left,
                    right: module.right,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backdropFilter: 'blur(10px)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: 'rgba(37,99,235,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={14} color={BLUE} />
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#E8EDF8',
                      }}
                    >
                      {module.label}
                    </span>

                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}

            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {[80, 140, 200].map((radius, index) => (
                <motion.circle
                  key={radius}
                  cx="50%"
                  cy="50%"
                  r={radius}
                  fill="none"
                  stroke="rgba(37,99,235,0.08)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + index * 0.3,
                  }}
                />
              ))}
            </svg>
          </motion.div>
        </div>
      </div>

      <style>
        {`
          @media (max-width: 768px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }

            .hero-visual {
              display: none !important;
            }
          }
        `}
      </style>
    </section>
  );
}