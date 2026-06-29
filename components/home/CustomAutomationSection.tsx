'use client';

import { useState, type CSSProperties, type FocusEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Cog,
  Link2,
  Database,
  MessageSquare,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';

type UseCase = {
  icon: LucideIcon;
  text: string;
};

type FormState = {
  nome: string;
  empresa: string;
  email: string;
  descricao: string;
};

type FormKey = keyof FormState;

type InputField = {
  k: Exclude<FormKey, 'descricao'>;
  l: string;
  type: 'text' | 'email';
  ph: string;
};

const useCases: UseCase[] = [
  { icon: Bot, text: 'Agentes de IA para qualificação de leads' },
  { icon: Cog, text: 'Automação de processos internos específicos' },
  { icon: MessageSquare, text: 'Assistentes inteligentes por departamento' },
  { icon: Link2, text: 'Integrações com CRM e ferramentas existentes' },
  { icon: Database, text: 'Extração e enriquecimento de dados' },
];

const fields: InputField[] = [
  { k: 'nome', l: 'Nome *', type: 'text', ph: 'João Silva' },
  { k: 'empresa', l: 'Empresa *', type: 'text', ph: 'Acme Lda.' },
  { k: 'email', l: 'Email *', type: 'email', ph: 'joao@empresa.pt' },
];

const inputStyle: CSSProperties = {
  width: '100%',
  backgroundColor: SURFACE2,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: '12px 16px',
  fontSize: 14,
  color: '#E8EDF8',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#E8EDF8',
  marginBottom: 8,
};

export default function CustomAutomationSection() {
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    nome: '',
    empresa: '',
    email: '',
    descricao: '',
  });

  const update = (key: FormKey, value: string): void => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const focusStyle = (
    event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    event.currentTarget.style.borderColor = BLUE;
  };

  const blurStyle = (
    event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    event.currentTarget.style.borderColor = BORDER;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      id="automacao"
      style={{
        backgroundColor: '#060B14',
        padding: '100px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <div
          className="automation-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'flex-start',
          }}
        >
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
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
              Soluções Personalizadas
            </div>

            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                fontWeight: 800,
                color: '#E8EDF8',
                letterSpacing: '-0.02em',
                marginBottom: 16,
                lineHeight: 1.15,
              }}
            >
              Precisa de uma automação específica para o seu negócio?
            </h2>

            <p
              style={{
                fontSize: 16,
                color: MUTED,
                lineHeight: 1.7,
                marginBottom: 36,
              }}
            >
              Nem todos os desafios se resolvem com um produto standard. A
              Norm8 desenvolve sistemas de IA personalizados, adaptados às
              necessidades específicas de cada empresa.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon;

                return (
                  <motion.div
                    key={useCase.text}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        backgroundColor: 'rgba(37,99,235,0.1)',
                        border: '1px solid rgba(37,99,235,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} color={BLUE} />
                    </div>

                    <span
                      style={{
                        fontSize: 14,
                        color: '#E8EDF8',
                        fontWeight: 500,
                      }}
                    >
                      {useCase.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 20,
                    padding: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#E8EDF8',
                      margin: 0,
                    }}
                  >
                    Solicitar Automação Personalizada
                  </h3>

                  {fields.map((field) => (
                    <div key={field.k}>
                      <label style={labelStyle}>{field.l}</label>

                      <input
                        type={field.type}
                        placeholder={field.ph}
                        required
                        value={form[field.k]}
                        onChange={(event) =>
                          update(field.k, event.target.value)
                        }
                        style={inputStyle}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={labelStyle}>
                      Descreva o desafio ou processo que pretende automatizar *
                    </label>

                    <textarea
                      required
                      placeholder="Ex: Precisamos de automatizar a qualificação de leads que chegam via formulário e integrá-los automaticamente no nosso CRM..."
                      value={form.descricao}
                      onChange={(event) =>
                        update('descricao', event.target.value)
                      }
                      style={{
                        ...inputStyle,
                        minHeight: 120,
                        resize: 'vertical',
                      }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      backgroundColor: BLUE,
                      border: 'none',
                      color: '#fff',
                      padding: '14px',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                    Solicitar Automação <ArrowRight size={16} />
                  </button>

                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      color: MUTED,
                      margin: 0,
                    }}
                  >
                    Resposta em 24 horas. Sem compromisso.
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    backgroundColor: SURFACE,
                    border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: 20,
                    padding: 40,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <CheckCircle2 size={28} color={BLUE} />
                  </div>

                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#E8EDF8',
                      marginBottom: 10,
                    }}
                  >
                    Pedido recebido!
                  </h3>

                  <p
                    style={{
                      fontSize: 15,
                      color: MUTED,
                    }}
                  >
                    A equipa Norm8 vai analisar o seu caso e entrar em contacto
                    em menos de 24 horas.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <style>
        {`
          @media (max-width: 768px) {
            .automation-grid {
              grid-template-columns: 1fr !important;
              gap: 48px !important;
            }
          }
        `}
      </style>
    </section>
  );
}