/**
 * ------------------------------------------------------------------
 * File: components/home/MeetingSection.tsx
 * Description: Public meeting request section for the Norm8 website.
 * Responsibilities:
 * - Render a lightweight date/time selection experience.
 * - Capture meeting intent without depending on Google Calendar yet.
 * - Submit requests through the generic lead submissions server action.
 * ------------------------------------------------------------------
 */

'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { submitMeetingRequest } from '@/app/actions/lead-submissions';
import type { ValidationErrors } from '@/lib/leads/types';
import { ArrowRight, Calendar, CheckCircle2, Clock } from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';

const timeSlots: string[] = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

type CalendarDay = {
  date: Date;
  available: boolean;
};

type FormState = {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  objetivo: string;
};

type FieldKey = keyof Omit<FormState, 'objetivo'>;

type FieldConfig = {
  k: FieldKey;
  l: string;
  type: 'text' | 'email' | 'tel';
  ph: string;
};

const fields: FieldConfig[] = [
  { k: 'nome', l: 'Nome *', type: 'text', ph: 'João Silva' },
  { k: 'empresa', l: 'Empresa *', type: 'text', ph: 'Acme Lda.' },
  { k: 'email', l: 'Email *', type: 'email', ph: 'joao@empresa.pt' },
  { k: 'telefone', l: 'Telefone', type: 'tel', ph: '+351 900 000 000' },
];

const meetingGoals: string[] = [
  'Geração de Leads',
  'Automação de Processos',
  'Customer Support AI',
  'CRM & Vendas',
  'Análise Geral',
  'Outro',
];

const weekDays: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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

const getCalendarDays = (): CalendarDay[] => {
  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = 0; i < 28; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    days.push({
      date,
      available: !isWeekend && i !== 0,
    });
  }

  return days;
};

/**
 * Renders the meeting request form and stores the request through the generic
 * lead submissions pipeline without integrating a real calendar yet.
 */
export default function MeetingSection() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    objetivo: '',
  });

  const calDays = getCalendarDays();

  const update = (key: keyof FormState, value: string): void => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const focusStyle = (
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    event.currentTarget.style.borderColor = BLUE;
  };

  const blurStyle = (
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    event.currentTarget.style.borderColor = BORDER;
  };

  /**
   * Sends the selected meeting slot and contact details to the server action.
   *
   * @param event Browser form submit event.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setValidationErrors({});

    if (!selectedDate || !selectedTime) {
      setErrorMessage('Selecione data e hora para continuar.');
      return;
    }

    setIsSubmitting(true);

    const result = await submitMeetingRequest({
      name: form.nome,
      company: form.empresa,
      email: form.email,
      phone: form.telefone,
      meetingGoal: form.objetivo,
      selectedDate: selectedDate.toISOString().slice(0, 10),
      selectedTime,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      setValidationErrors(result.validationErrors ?? {});
      return;
    }

    setSubmitted(true);
  };

  const validationSummary = Object.values(validationErrors).flat();

  const formatDate = (date: Date | null): string => {
    if (!date) {
      return '';
    }

    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const firstDay = calDays[0]?.date.getDay() ?? 1;
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  return (
    <section
      id="reuniao"
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
            Marcação de Reunião
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
            Vamos falar sobre o seu negócio.
          </h2>

          <p
            style={{
              fontSize: 18,
              color: MUTED,
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            Marque uma discovery call de 30 minutos. Sem compromisso.
          </p>
        </motion.div>

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
                overflow: 'hidden',
                maxWidth: 900,
                margin: '0 auto',
              }}
            >
              <div
                className="meeting-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                }}
              >
                <div
                  style={{
                    padding: '40px',
                    borderRight: `1px solid ${BORDER}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#E8EDF8',
                      marginBottom: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Calendar size={18} color={BLUE} /> Escolha uma data
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        style={{
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: 600,
                          color: MUTED,
                          padding: '4px 0',
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 4,
                    }}
                  >
                    {Array.from({ length: offset }).map((_, index) => (
                      <div key={`empty-${index}`} />
                    ))}

                    {calDays.map((day) => {
                      const isSelected =
                        selectedDate !== null &&
                        day.date.toDateString() === selectedDate.toDateString();

                      return (
                        <button
                          key={day.date.toISOString()}
                          type="button"
                          disabled={!day.available}
                          onClick={() => {
                            if (day.available) {
                              setSelectedDate(day.date);
                              setSelectedTime(null);
                            }
                          }}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 500,
                            border: isSelected
                              ? `1px solid ${BLUE}`
                              : '1px solid transparent',
                            backgroundColor: isSelected
                              ? 'rgba(37,99,235,0.2)'
                              : 'transparent',
                            color: !day.available
                              ? '#2a3548'
                              : isSelected
                                ? '#fff'
                                : '#E8EDF8',
                            cursor: day.available ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s',
                          }}
                        >
                          {day.date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ marginTop: 28 }}
                    >
                      <h3
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#E8EDF8',
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Clock size={14} color={BLUE} />{' '}
                        {formatDate(selectedDate)}
                      </h3>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 6,
                        }}
                      >
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            style={{
                              padding: '8px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 500,
                              border:
                                selectedTime === time
                                  ? `1px solid ${BLUE}`
                                  : `1px solid ${BORDER}`,
                              backgroundColor:
                                selectedTime === time
                                  ? 'rgba(37,99,235,0.2)'
                                  : SURFACE2,
                              color:
                                selectedTime === time ? '#fff' : '#E8EDF8',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div style={{ padding: '40px' }}>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#E8EDF8',
                      marginBottom: 24,
                    }}
                  >
                    Os seus dados
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 20,
                    }}
                  >
                    {fields.map((field) => (
                      <div key={field.k}>
                        <label style={labelStyle}>{field.l}</label>

                        <input
                          type={field.type}
                          placeholder={field.ph}
                          required={field.l.includes('*')}
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
                      <label style={labelStyle}>Objetivo da Reunião</label>

                      <select
                        value={form.objetivo}
                        onChange={(event) =>
                          update('objetivo', event.target.value)
                        }
                        style={{
                          ...inputStyle,
                          appearance: 'none',
                        }}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                      >
                        <option value="">Selecionar...</option>

                        {meetingGoals.map((goal) => (
                          <option key={goal} value={goal}>
                            {goal}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(errorMessage || validationSummary.length > 0) && (
                    <div
                      style={{
                        backgroundColor: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: 10,
                        color: '#fecaca',
                        fontSize: 13,
                        marginTop: 20,
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
                    disabled={isSubmitting || !selectedDate || !selectedTime}
                    style={{
                      marginTop: 28,
                      width: '100%',
                      backgroundColor: BLUE,
                      border: 'none',
                      color: '#fff',
                      padding: '14px',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor:
                        selectedDate && selectedTime && !isSubmitting
                          ? 'pointer'
                          : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: !selectedDate || !selectedTime ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(event) => {
                      if (selectedDate && selectedTime) {
                        event.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity =
                        !selectedDate || !selectedTime ? '0.5' : '1';
                    }}
                  >
                    {isSubmitting ? 'A enviar...' : 'Marcar Reunião'}{' '}
                    <ArrowRight size={16} />
                  </button>

                  {(!selectedDate || !selectedTime) && (
                    <p
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: MUTED,
                        marginTop: 10,
                      }}
                    >
                      Selecione data e hora para continuar.
                    </p>
                  )}
                </div>
              </div>
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
                padding: '64px',
                maxWidth: 900,
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
                Pedido de reunião recebido!
              </h3>

              <p
                style={{
                  fontSize: 16,
                  color: MUTED,
                }}
              >
                Pedido de reunião recebido. Iremos confirmar a disponibilidade.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>
        {`
          @media (max-width: 700px) {
            .meeting-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </section>
  );
}
