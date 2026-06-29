'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Target, Layers, type LucideIcon } from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';

const benefits: string[] = [
  'Recolha automática de dados',
  'Análise e filtragem inteligente',
  'Redução de tempo e custos operacionais',
  'Preparado para escalabilidade e conformidade',
];

type UpcomingProduct = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const upcoming: UpcomingProduct[] = [
  {
    icon: Zap,
    title: 'Soluções de IA para Operações',
    desc: 'Ferramentas para automatizar operações internas e aumentar eficiência operacional.',
  },
  {
    icon: Target,
    title: 'Plataformas Verticais por Indústria',
    desc: 'Software especializado para setores específicos com necessidades próprias.',
  },
  {
    icon: Layers,
    title: 'Sistemas Internos de Produtividade',
    desc: 'Ferramentas para gestão, colaboração e execução de processos empresariais.',
  },
];

export default function ProductsSection() {
  return (
    <section
      id="produtos"
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 64 }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: BLUE,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Produtos
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 800,
              color: '#E8EDF8',
              letterSpacing: '-0.02em',
              marginBottom: 10,
            }}
          >
            Soluções Norm8
          </h2>

          <p
            style={{
              fontSize: 16,
              color: MUTED,
              maxWidth: 520,
              lineHeight: 1.65,
            }}
          >
            Software desenvolvido internamente pela Norm8 para resolver
            problemas específicos de diferentes indústrias.
          </p>
        </motion.div>

        {/* SeguroScout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
            padding: '48px 48px',
            marginBottom: 72,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              fontSize: 11,
              fontWeight: 600,
              color: BLUE,
              backgroundColor: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.2)',
              padding: '3px 10px',
              borderRadius: 20,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Produto Ativo
          </span>

          <div
            className="p-main-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'start',
            }}
          >
            {/* Left */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  marginBottom: 16,
                }}
              >
                <img
                  src="https://media.base44.com/images/public/69600cf78015f5b911c4dcc2/06a317517_image.png"
                  alt="SeguroScout"
                  style={{
                    width: 88,
                    height: 88,
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />

                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#E8EDF8',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  SeguroScout
                </h3>
              </div>

              <p
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#E8EDF8',
                  marginBottom: 14,
                }}
              >
                Plataforma inteligente de análise e gestão de seguros.
              </p>

              <p
                style={{
                  fontSize: 14,
                  color: MUTED,
                  lineHeight: 1.7,
                  marginBottom: 28,
                }}
              >
                O SeguroScout utiliza Inteligência Artificial para automatizar a
                pesquisa, comparação e qualificação de seguros, permitindo
                decisões mais rápidas, informadas e eficientes.
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 28px',
                }}
              >
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      color: '#d1d5db',
                      marginBottom: 10,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7.5L5.5 10.5L11.5 4.5"
                        stroke={BLUE}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {benefit}
                  </li>
                ))}
              </ul>

              <Link
                href="/seguro-scout"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: BLUE,
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '12px 22px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = '1';
                }}
              >
                Ver SeguroScout <ArrowRight size={15} />
              </Link>
            </div>

            {/* Right */}
            <div
              style={{
                backgroundColor: SURFACE2,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                minHeight: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 32px',
              }}
            >
              <img
                src="https://media.base44.com/images/public/69600cf78015f5b911c4dcc2/53f496669_image.png"
                alt="SeguroScout Intelligence"
                style={{
                  width: '100%',
                  maxWidth: 380,
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Próximos Produtos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: 32 }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: BLUE,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Próximos Produtos
          </div>

          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#E8EDF8',
              letterSpacing: '-0.01em',
              marginBottom: 32,
            }}
          >
            Em desenvolvimento
          </h3>
        </motion.div>

        <div
          className="upcoming-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            backgroundColor: BORDER,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 48,
          }}
        >
          {upcoming.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                style={{
                  backgroundColor: SURFACE,
                  padding: '32px 30px',
                  transition: 'background-color 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = SURFACE2;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = SURFACE;
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      backgroundColor: 'rgba(37,99,235,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={BLUE} style={{ opacity: 0.6 }} />
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: MUTED,
                      textTransform: 'uppercase',
                      backgroundColor: 'rgba(131,153,184,0.08)',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    Em desenvolvimento
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 10,
                  }}
                >
                  {item.title}
                </h4>

                <p
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        <p
          style={{
            fontSize: 13,
            color: MUTED,
            textAlign: 'center',
            margin: 0,
          }}
        >
          Novas soluções de IA a serem lançadas em breve.
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .p-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .upcoming-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}