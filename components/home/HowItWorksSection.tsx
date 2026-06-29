'use client';

import { motion } from 'framer-motion';
import {
  Search,
  Map,
  Cpu,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const BORDER = '#182034';
const MUTED = '#8399B8';

type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  desc: string;
};

const steps: Step[] = [
  {
    num: '01',
    icon: Search,
    title: 'Auditoria',
    desc: 'Analisamos processos, ferramentas e pontos de atrito para identificar onde a automação faz sentido.',
  },
  {
    num: '02',
    icon: Map,
    title: 'Plano',
    desc: 'Criamos um roadmap claro com prioridades, dependências e critérios de sucesso.',
  },
  {
    num: '03',
    icon: Cpu,
    title: 'Implementação',
    desc: 'Desenvolvemos e integramos sistemas de IA e automação testados com dados reais.',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: 'Otimização',
    desc: 'Monitorizamos resultados, ajustamos fluxos e escalamos o que funciona.',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      style={{
        backgroundColor: '#060B14',
        padding: '100px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            marginBottom: 72,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: BLUE,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Como Funciona
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 800,
              color: '#E8EDF8',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Do diagnóstico à escala.
          </h2>

          <p
            style={{
              fontSize: 18,
              color: MUTED,
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            Um processo estruturado, sem promessas vazias.
          </p>
        </motion.div>

        <div
          className="steps-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                style={{ position: 'relative' }}
              >
                {index < steps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 32,
                      left: '75%',
                      width: '50%',
                      height: 1,
                      background: `linear-gradient(90deg, ${BORDER} 0%, transparent 100%)`,
                      zIndex: 1,
                    }}
                  />
                )}

                <div
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 16,
                    padding: 32,
                    height: '100%',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor =
                      'rgba(37,99,235,0.3)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = BORDER;
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: 'rgba(37,99,235,0.12)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 24,
                    }}
                  >
                    <Icon size={22} color={BLUE} />
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: BLUE,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    {step.num}
                  </div>

                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#E8EDF8',
                      marginBottom: 12,
                    }}
                  >
                    {step.title}
                  </h3>

                  <p
                    style={{
                      fontSize: 14,
                      color: MUTED,
                      lineHeight: 1.65,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .steps-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 600px) {
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}