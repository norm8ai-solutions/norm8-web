'use client';

import { motion } from 'framer-motion';
import {
  Lock,
  Eye,
  Shield,
  Server,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const BORDER = '#182034';
const MUTED = '#8399B8';

type SecurityFeature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const features: SecurityFeature[] = [
  {
    icon: Lock,
    title: 'Controlo de acesso',
    desc: 'Permissões granulares e gestão segura de utilizadores.',
  },
  {
    icon: Eye,
    title: 'Auditoria e rastreabilidade',
    desc: 'Registo completo de ações, alterações e atividade no sistema.',
  },
  {
    icon: Shield,
    title: 'Proteção de dados',
    desc: 'Estrutura preparada para proteção de informação crítica.',
  },
  {
    icon: Server,
    title: 'Infraestrutura segura',
    desc: 'Arquitetura preparada para crescimento, estabilidade e segurança.',
  },
];

const badges: string[] = [
  'Dados protegidos',
  'Logs auditáveis',
  'Permissões por utilizador',
  'Estrutura escalável',
];

export default function SecuritySection() {
  return (
    <section
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
            marginBottom: 64,
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
            Segurança
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
            Segurança integrada no núcleo do sistema.
          </h2>

          <p
            style={{
              fontSize: 18,
              color: MUTED,
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            Desenhado para operar com segurança, controlo e visibilidade total
            sobre os dados e operações.
          </p>
        </motion.div>

        <div
          className="security-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 40,
          }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: 28,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor =
                    'rgba(37,99,235,0.4)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = BORDER;
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    border: '1px solid rgba(37,99,235,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Icon size={20} color={BLUE} />
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#E8EDF8',
                    marginBottom: 10,
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.6,
                  }}
                >
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          {badges.map((badge) => (
            <div
              key={badge}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: MUTED,
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={15} color={BLUE} />
              {badge}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .security-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 500px) {
          .security-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}