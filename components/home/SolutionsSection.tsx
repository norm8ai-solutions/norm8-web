'use client';

import { motion } from 'framer-motion';
import {
  Workflow,
  Brain,
  Server,
  Plug,
  TrendingUp,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';

type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const services: Service[] = [
  {
    icon: Workflow,
    title: 'Automação de Processos',
    description:
      'Identificamos e automatizamos tarefas repetitivas que consomem tempo da equipa, sem substituir o julgamento humano.',
  },
  {
    icon: Brain,
    title: 'Inteligência Artificial',
    description:
      'Implementamos sistemas de IA para classificação, análise e decisão em fluxos de trabalho específicos.',
  },
  {
    icon: Server,
    title: 'Sistemas Internos',
    description:
      'Desenvolvemos ferramentas e plataformas internas adaptadas às necessidades operacionais da empresa.',
  },
  {
    icon: Plug,
    title: 'Integrações',
    description:
      'Conectamos ferramentas e sistemas existentes para eliminar silos de informação e sincronizar dados.',
  },
  {
    icon: TrendingUp,
    title: 'Automação Comercial',
    description:
      'Automatizamos fluxos de prospeção, qualificação e follow-up para equipas comerciais.',
  },
  {
    icon: MessageCircle,
    title: 'Automação de Suporte',
    description:
      'Sistemas de resposta automática e triagem de pedidos para equipas de suporte ao cliente.',
  },
];

export default function SolutionsSection() {
  return (
    <section
      id="solucoes"
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
            Serviços
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
            O que desenvolvemos.
          </h2>

          <p
            style={{
              fontSize: 16,
              color: MUTED,
              maxWidth: 520,
            }}
          >
            Acreditamos que processos bem estruturados criam empresas mais
            eficientes.
          </p>
        </motion.div>

        <div
          className="services-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            backgroundColor: BORDER,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                style={{
                  backgroundColor: SURFACE,
                  padding: '32px',
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
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <Icon size={18} color={BLUE} />
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#E8EDF8',
                    marginBottom: 8,
                  }}
                >
                  {service.title}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>
        {`
          @media (max-width: 900px) {
            .services-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }

          @media (max-width: 580px) {
            .services-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </section>
  );
}