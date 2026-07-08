/**
 * ------------------------------------------------------------------
 * File: components/home/AuditSection.tsx
 * Description: Public Intelligent Audit request section for the Norm8 website.
 * Responsibilities:
 * - Render the audit lead form.
 * - Collect structured audit context for future analysis.
 * - Submit requests through the generic lead submissions server action.
 * ------------------------------------------------------------------
 */

'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { submitAuditRequest } from '@/app/actions/lead-submissions';
import { FieldError } from '@/components/ui/field-error';
import { Norm8Select } from '@/components/ui/norm8-select';
import type { ValidationErrors } from '@/lib/leads/types';
import {
  CheckCircle2,
  MailCheck,
  SearchCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';
const ERROR = '#F87171';

type FormState = {
  nome: string;
  empresa: string;
  website: string;
  setor: string;
  colaboradores: string;
  receita: string;
  ferramentas: string;
  desafio: string;
  objetivo: string;
  email: string;
  telefone: string;
};

type FormKey = keyof FormState;

type InputField = {
  k: FormKey;
  l: string;
  type: 'text' | 'url' | 'email' | 'tel';
  placeholder: string;
};

type ProcessCard = {
  icon: LucideIcon;
  label: string;
  subtext: string;
  color: string;
};

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#E8EDF8',
  marginBottom: 8,
};

const getInputStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle,
  borderColor: hasError ? ERROR : BORDER,
  boxShadow: hasError ? '0 0 0 2px rgba(248,113,113,0.12)' : undefined,
});

const requiredFieldMessages: Partial<Record<FormKey, string>> = {
  nome: 'Indique o seu nome.',
  empresa: 'Indique o nome da empresa.',
  email: 'Indique um email válido.',
  setor: 'Selecione o setor de atividade.',
  colaboradores: 'Selecione o número de colaboradores.',
  receita: 'Selecione a receita anual estimada.',
  desafio: 'Indique o maior desafio operacional.',
  objetivo: 'Indique o objetivo principal.',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputFields: InputField[] = [
  {
    k: 'nome',
    l: 'Nome *',
    type: 'text',
    placeholder: 'João Silva',
  },
  {
    k: 'empresa',
    l: 'Nome da Empresa *',
    type: 'text',
    placeholder: 'Acme Lda.',
  },
  {
    k: 'website',
    l: 'Website',
    type: 'url',
    placeholder: 'https://exemplo.pt',
  },
  {
    k: 'email',
    l: 'Email *',
    type: 'email',
    placeholder: 'nome@empresa.pt',
  },
  {
    k: 'telefone',
    l: 'Telefone',
    type: 'tel',
    placeholder: '+351 900 000 000',
  },
];

const setores = [
  'Serviços Profissionais',
  'Consultoria',
  'Imobiliário',
  'Saúde e Clínicas',
  'Estética e Bem-estar',
  'Restauração',
  'Hotelaria e Turismo',
  'Educação e Formação',
  'E-commerce',
  'Retalho',
  'Construção',
  'Seguros',
  'Contabilidade e Finanças',
  'Jurídico',
  'Tecnologia / SaaS',
  'Marketing e Agências',
  'Automóvel',
  'Indústria',
  'Logística',
  'Outro',
].map((setor) => ({
  value: setor,
  label: setor,
}));

const colaboradoresOptions = [
  '1–10',
  '11–50',
  '51–200',
  '201–500',
  '500+',
].map((option) => ({
  value: option,
  label: option,
}));

const receitaOptions = [
  'Ainda sem receita',
  'Até 50.000€',
  '50.000€ – 100.000€',
  '100.000€ – 250.000€',
  '250.000€ – 500.000€',
  '500.000€ – 1M€',
  '1M€ – 2.5M€',
  '2.5M€ – 5M€',
  'Mais de 5M€',
  'Prefiro não dizer',
].map((option) => ({
  value: option,
  label: option,
}));

const processCards: ProcessCard[] = [
  {
    icon: CheckCircle2,
    label: 'Pedido recebido',
    subtext: 'Informações registadas com sucesso',
    color: BLUE,
  },
  {
    icon: SearchCheck,
    label: 'Pré-análise gerada',
    subtext: 'Resumo inicial preparado com IA',
    color: '#8b5cf6',
  },
  {
    icon: MailCheck,
    label: 'Próximos passos por email',
    subtext: 'Receberá a pré-análise na sua caixa de entrada',
    color: '#10b981',
  },
];

/**
 * Renders the Intelligent Audit lead form and submits it through the shared
 * server-side submissions pipeline.
 */
export default function AuditSection() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormKey, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<FormState>({
    nome: '',
    empresa: '',
    website: '',
    setor: '',
    colaboradores: '',
    receita: '',
    ferramentas: '',
    desafio: '',
    objetivo: '',
    email: '',
    telefone: '',
  });

  const update = (key: FormKey, value: string): void => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setFieldErrors((currentErrors) => {
      if (!currentErrors[key]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const focusFirstInvalidField = (errors: Partial<Record<FormKey, string>>): void => {
    const firstInvalidKey = Object.keys(errors)[0];

    if (!firstInvalidKey) {
      return;
    }

    const field = formRef.current?.querySelector<HTMLElement>(
      `[data-field="${firstInvalidKey}"] input, [data-field="${firstInvalidKey}"] textarea, [data-field="${firstInvalidKey}"] button`,
    );

    field?.focus({ preventScroll: true });
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const validateForm = (): Partial<Record<FormKey, string>> => {
    const errors: Partial<Record<FormKey, string>> = {};

    Object.entries(requiredFieldMessages).forEach(([field, message]) => {
      const key = field as FormKey;

      if (!form[key].trim()) {
        errors[key] = message;
      }
    });

    if (form.email.trim() && !emailPattern.test(form.email.trim())) {
      errors.email = 'Indique um email válido.';
    }

    return errors;
  };

  const focusStyle = (
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): void => {
    event.currentTarget.style.borderColor =
      event.currentTarget.getAttribute('aria-invalid') === 'true' ? ERROR : BLUE;
  };

  const blurStyle = (
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): void => {
    event.currentTarget.style.borderColor =
      event.currentTarget.getAttribute('aria-invalid') === 'true' ? ERROR : BORDER;
  };

  /**
   * Sends the audit form to the server action using English domain keys while
   * keeping the visible UI labels in Portuguese.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setValidationErrors({});

    const clientErrors = validateForm();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      focusFirstInvalidField(clientErrors);
      return;
    }

    setIsSubmitting(true);

    const result = await submitAuditRequest({
      name: form.nome,
      company: form.empresa,
      website: form.website,
      email: form.email,
      phone: form.telefone,
      industry: form.setor,
      employees: form.colaboradores,
      annualRevenue: form.receita,
      toolsUsed: form.ferramentas,
      mainChallenge: form.desafio,
      mainGoal: form.objetivo,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      setValidationErrors(result.validationErrors ?? {});
      return;
    }

    setSubmitted(true);
  };

  /**
   * Reads validation errors generated by the server schema.
   *
   * @param field Server-side payload field name.
   * @returns First validation message for the field, when available.
   */
  const fieldError = (field: string): string | undefined =>
    validationErrors[field]?.[0];

  const validationSummary = Object.values(validationErrors).flat();

  return (
    <section
      id="auditoria"
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
            Auditoria Inteligente
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
            Descubra onde pode automatizar mais.
          </h2>

          <p
            style={{
              fontSize: 18,
              color: MUTED,
              maxWidth: 520,
              margin: '0 auto',
            }}
          >
            Preencha o formulário e receba uma auditoria personalizada com as
            oportunidades de automação do seu negócio.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: '48px',
                maxWidth: 860,
                margin: '0 auto',
              }}
            >
              <form ref={formRef} noValidate onSubmit={handleSubmit}>
                <div
                  className="form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 24,
                  }}
                >
                  {inputFields.map((field) => {
                    const error = fieldErrors[field.k];
                    const errorId = 'audit-' + field.k + '-error';

                    return (
                      <div data-field={field.k} key={field.k}>
                        <label style={labelStyle}>{field.l}</label>

                        <input
                          aria-describedby={error ? errorId : undefined}
                          aria-invalid={Boolean(error)}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={form[field.k]}
                          onChange={(event) =>
                            update(field.k, event.target.value)
                          }
                          style={getInputStyle(Boolean(error))}
                          onFocus={focusStyle}
                          onBlur={blurStyle}
                        />
                        <FieldError id={errorId} message={error} />
                      </div>
                    );
                  })}

                  <div data-field="setor">
                    <label style={labelStyle}>Setor de Atividade *</label>
                    <Norm8Select
                      error={Boolean(fieldErrors.setor)}
                      errorId="audit-setor-error"
                      options={setores}
                      ariaRequired
                      value={form.setor}
                      onValueChange={(value) => update('setor', value)}
                      placeholder="Selecionar setor..."
                    />
                    <FieldError id="audit-setor-error" message={fieldErrors.setor} />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Número de Colaboradores *
                    </label>
                    <Norm8Select
                      ariaRequired
                      options={colaboradoresOptions}
                      value={form.colaboradores}
                      onValueChange={(value) => update('colaboradores', value)}
                      placeholder="Selecionar equipa..."
                    />
                  </div>

                  <div data-field="receita">
                    <label style={labelStyle}>Receita Anual estimada *</label>
                    <Norm8Select
                      error={Boolean(fieldErrors.receita)}
                      errorId="audit-receita-error"
                      options={receitaOptions}
                      ariaRequired
                      value={form.receita}
                      onValueChange={(value) => update('receita', value)}
                      placeholder="Selecionar receita..."
                    />
                    <FieldError id="audit-receita-error" message={fieldErrors.receita} />
                  </div>

                  <div>
                    <label style={labelStyle}>Ferramentas Utilizadas</label>

                    <input
                      type="text"
                      placeholder="HubSpot, Slack, Excel, Notion..."
                      value={form.ferramentas}
                      onChange={(event) =>
                        update('ferramentas', event.target.value)
                      }
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>

                <div data-field="desafio" style={{ marginTop: 24 }}>
                  <label style={labelStyle}>Maior Desafio Operacional *</label>

                  <textarea
                    aria-describedby={fieldErrors.desafio ? 'audit-desafio-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.desafio)}
                    placeholder="Descreva o maior ponto de atrito ou processo mais demorado no seu negócio..."
                    value={form.desafio}
                    onChange={(event) =>
                      update('desafio', event.target.value)
                    }
                    style={{
                      ...getInputStyle(Boolean(fieldErrors.desafio)),
                      minHeight: 100,
                      resize: 'vertical',
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  <FieldError id="audit-desafio-error" message={fieldErrors.desafio} />
                </div>

                <div data-field="objetivo" style={{ marginTop: 24 }}>
                  <label style={labelStyle}>Objetivo Principal *</label>

                  <textarea
                    aria-describedby={fieldErrors.objetivo ? 'audit-objetivo-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.objetivo)}
                    placeholder="O que pretende alcançar com automação nos próximos 6–12 meses?"
                    value={form.objetivo}
                    onChange={(event) =>
                      update('objetivo', event.target.value)
                    }
                    style={{
                      ...getInputStyle(Boolean(fieldErrors.objetivo)),
                      minHeight: 80,
                      resize: 'vertical',
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  <FieldError id="audit-objetivo-error" message={fieldErrors.objetivo} />
                </div>

                {(errorMessage || validationSummary.length > 0) && (
                  <div
                    style={{
                      backgroundColor: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.25)',
                      borderRadius: 10,
                      color: '#fecaca',
                      fontSize: 13,
                      marginTop: 24,
                      padding: '12px 14px',
                    }}
                  >
                    {errorMessage && <p style={{ margin: 0 }}>{errorMessage}</p>}

                    {validationSummary.map((message) => (
                      <p key={message} style={{ margin: '6px 0 0' }}>
                        {message}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: 32,
                    width: '100%',
                    backgroundColor: BLUE,
                    border: 'none',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
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
                  <Sparkles size={18} />{' '}
                  {isSubmitting ? 'A enviar...' : 'Obter Auditoria Inteligente'}
                </button>

                <p
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    color: MUTED,
                    marginTop: 16,
                  }}
                >
                  Sem spam. Resposta em 24 horas. Dados protegidos.
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                backgroundColor: SURFACE,
                border: '1px solid rgba(37,99,235,0.3)',
                borderRadius: 20,
                padding: '64px 48px',
                maxWidth: 860,
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37,99,235,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <CheckCircle2 size={36} color={BLUE} />
              </div>

              <h3
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#E8EDF8',
                  marginBottom: 12,
                }}
              >
                Auditoria em preparação
              </h3>

              <p
                style={{
                  fontSize: 16,
                  color: MUTED,
                  maxWidth: 520,
                  margin: '0 auto 48px',
                }}
              >
                A sua pré-análise está a ser preparada e será enviada por email dentro de instantes.
              </p>

              <div
                className="process-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                {processCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      style={{
                        backgroundColor: SURFACE2,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 14,
                        padding: 24,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: `${card.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}
                      >
                        <Icon size={18} color={card.color} />
                      </div>

                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: '#E8EDF8',
                          marginBottom: 6,
                        }}
                      >
                        {card.label}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: MUTED,
                          lineHeight: 1.5,
                        }}
                      >
                        {card.subtext}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>
        {`
          @media (max-width: 640px) {
            .form-grid {
              grid-template-columns: 1fr !important;
            }

            .process-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </section>
  );
}
