/**
 * ------------------------------------------------------------------
 * File: components/home/CustomAutomationSection.tsx
 * Description: Public custom automation request section for the Norm8 website.
 * Responsibilities:
 * - Render the productized custom automation lead form.
 * - Capture enough structured context for future sales and AI analysis.
 * - Submit requests through the generic lead submissions server action.
 * ------------------------------------------------------------------
 */

'use client';

import { useState, type CSSProperties, type FocusEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { submitCustomAutomationRequest } from '@/app/actions/lead-submissions';
import type { ValidationErrors } from '@/lib/leads/types';
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
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  employees: string;
  industry: string;
  processToAutomate: string;
  currentTools: string;
  mainChallenge: string;
  desiredOutcome: string;
  estimatedBudget: string;
  desiredTimeline: string;
};

type FormKey = keyof FormState;

type InputField = {
  k: Exclude<FormKey, 'processToAutomate' | 'mainChallenge'>;
  l: string;
  type: 'text' | 'email' | 'tel' | 'url';
  ph: string;
  required?: boolean;
};

const useCases: UseCase[] = [
  { icon: Bot, text: 'Agentes de IA para qualificação de leads' },
  { icon: Cog, text: 'Automação de processos internos específicos' },
  { icon: MessageSquare, text: 'Assistentes inteligentes por departamento' },
  { icon: Link2, text: 'Integrações com CRM e ferramentas existentes' },
  { icon: Database, text: 'Extração e enriquecimento de dados' },
];

const fields: InputField[] = [
  { k: 'name', l: 'Nome *', type: 'text', ph: 'João Silva', required: true },
  { k: 'company', l: 'Empresa *', type: 'text', ph: 'Acme Lda.', required: true },
  { k: 'role', l: 'Cargo', type: 'text', ph: 'COO, CEO, Diretor Comercial...' },
  { k: 'email', l: 'Email *', type: 'email', ph: 'joao@empresa.pt', required: true },
  { k: 'phone', l: 'Telefone', type: 'tel', ph: '+351 900 000 000' },
  { k: 'website', l: 'Website', type: 'url', ph: 'https://exemplo.pt' },
  { k: 'employees', l: 'Número de colaboradores', type: 'text', ph: '11-50' },
  { k: 'industry', l: 'Setor', type: 'text', ph: 'Serviços B2B' },
  { k: 'currentTools', l: 'Ferramentas atuais', type: 'text', ph: 'CRM, Excel, Notion...' },
  { k: 'desiredOutcome', l: 'Resultado pretendido', type: 'text', ph: 'Reduzir trabalho manual em 40%' },
  { k: 'estimatedBudget', l: 'Budget estimado', type: 'text', ph: '2k-5k, 5k-10k...' },
  { k: 'desiredTimeline', l: 'Timeline desejada', type: 'text', ph: 'Este mês, próximo trimestre...' },
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

/**
 * Renders and submits the custom automation request form.
 */
export default function CustomAutomationSection() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [form, setForm] = useState<FormState>({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    website: '',
    employees: '',
    industry: '',
    processToAutomate: '',
    currentTools: '',
    mainChallenge: '',
    desiredOutcome: '',
    estimatedBudget: '',
    desiredTimeline: '',
  });

  /**
   * Updates one controlled form field.
   *
   * @param key Field key in the local form state.
   * @param value New field value.
   */
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

  /**
   * Sends the request through the central lead submissions service.
   *
   * @param event Browser form submit event.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationErrors({});

    const result = await submitCustomAutomationRequest(form);

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      setValidationErrors(result.validationErrors ?? {});
      return;
    }

    setSubmitted(true);
  };

  const validationSummary = Object.values(validationErrors).flat();

  return (
    <section id="automacao" style={{ backgroundColor: '#060B14', padding: '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div className="automation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'flex-start' }}>
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: BLUE, textTransform: 'uppercase', marginBottom: 16 }}>
              Soluções Personalizadas
            </div>

            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#E8EDF8', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
              Precisa de uma automação específica para o seu negócio?
            </h2>

            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7, marginBottom: 36 }}>
              Nem todos os desafios se resolvem com um produto standard. A Norm8
              desenvolve sistemas de IA personalizados, adaptados às necessidades
              específicas de cada empresa.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon;

                return (
                  <motion.div key={useCase.text} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={BLUE} />
                    </div>

                    <span style={{ fontSize: 14, color: '#E8EDF8', fontWeight: 500 }}>
                      {useCase.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#E8EDF8', margin: 0 }}>
                    Solicitar Automação Personalizada
                  </h3>

                  {fields.map((field) => (
                    <div key={field.k}>
                      <label style={labelStyle}>{field.l}</label>

                      <input type={field.type} placeholder={field.ph} required={field.required} value={form[field.k]} onChange={(event) => update(field.k, event.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                    </div>
                  ))}

                  <div>
                    <label style={labelStyle}>Processo que pretende automatizar *</label>

                    <textarea required placeholder="Ex: qualificação de leads, triagem de pedidos, atualização de CRM..." value={form.processToAutomate} onChange={(event) => update('processToAutomate', event.target.value)} style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Principal desafio *</label>

                    <textarea required placeholder="Descreva o ponto de atrito, volume manual ou bloqueio operacional." value={form.mainChallenge} onChange={(event) => update('mainChallenge', event.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>

                  {(errorMessage || validationSummary.length > 0) && (
                    <div style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, color: '#fecaca', fontSize: 13, padding: '12px 14px' }}>
                      {errorMessage && <p style={{ margin: 0 }}>{errorMessage}</p>}
                      {validationSummary.map((message) => (
                        <p key={message} style={{ margin: '6px 0 0' }}>{message}</p>
                      ))}
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting} style={{ backgroundColor: BLUE, border: 'none', color: '#fff', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s' }}>
                    {isSubmitting ? 'A enviar...' : 'Solicitar Automação'} <ArrowRight size={16} />
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, margin: 0 }}>
                    Resposta em 24 horas. Sem compromisso.
                  </p>
                </motion.form>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: SURFACE, border: '1px solid rgba(37,99,235,0.3)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle2 size={28} color={BLUE} />
                  </div>

                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#E8EDF8', marginBottom: 10 }}>
                    Pedido recebido!
                  </h3>

                  <p style={{ fontSize: 15, color: MUTED }}>
                    Pedido recebido. Vamos analisar o desafio e responder em até 24 horas.
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
