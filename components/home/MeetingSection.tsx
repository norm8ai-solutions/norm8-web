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

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getAvailableMeetingSlotsAction } from '@/app/actions/meeting-availability';
import { submitMeetingRequest } from '@/app/actions/lead-submissions';
import { FieldError } from '@/components/ui/field-error';
import { Norm8Select } from '@/components/ui/norm8-select';
import type {
  AvailableMeetingDay,
  AvailableMeetingSlot,
} from '@/lib/calendar/types';
import type { ValidationErrors } from '@/lib/leads/types';
import { ArrowRight, Calendar, CheckCircle2, Clock } from 'lucide-react';

const BLUE = '#2563EB';
const SURFACE = '#0A1120';
const SURFACE2 = '#0D1526';
const BORDER = '#182034';
const MUTED = '#8399B8';
const ERROR = '#F87171';

type CalendarDay = {
  date: Date;
  available: boolean;
  slots: AvailableMeetingSlot[];
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

const meetingGoals = [
  'Geração de Leads',
  'Automação de Processos',
  'Customer Support AI',
  'CRM & Vendas',
  'Análise Geral',
  'Outro',
].map((goal) => ({
  value: goal,
  label: goal,
}));

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

const getInputStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle,
  borderColor: hasError ? ERROR : BORDER,
  boxShadow: hasError ? '0 0 0 2px rgba(248,113,113,0.12)' : undefined,
});

const requiredFieldMessages: Partial<Record<keyof FormState, string>> = {
  nome: 'Indique o seu nome.',
  empresa: 'Indique o nome da empresa.',
  email: 'Indique um email válido.',
  objetivo: 'Selecione o objetivo da reunião.',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const getAvailabilityRange = (): { startDate: string; endDate: string } => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 27);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
};

const toCalendarDays = (days: AvailableMeetingDay[]): CalendarDay[] =>
  days.map((day) => ({
    date: new Date(`${day.date}T00:00:00.000Z`),
    available: day.available,
    slots: day.slots,
  }));

/**
 * Renders the meeting request form and stores the request through the generic
 * lead submissions pipeline without integrating a real calendar yet.
 */
export default function MeetingSection() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState<string>(
    'Pedido de reunião recebido!',
  );
  const [successMessage, setSuccessMessage] = useState<string>(
    'Pedido de reunião recebido. Iremos confirmar a disponibilidade.',
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableMeetingSlot | null>(null);
  const [calDays, setCalDays] = useState<CalendarDay[]>([]);

  const [form, setForm] = useState<FormState>({
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    objetivo: '',
  });

  useEffect(() => {
    let isMounted = true;

    /**
     * Loads real availability from the server-side Google Calendar integration.
     * The UI keeps the same calendar structure while replacing mocked slots.
     */
    const loadAvailability = async (): Promise<void> => {
      setIsLoadingAvailability(true);
      setAvailabilityError(null);

      const result = await getAvailableMeetingSlotsAction(getAvailabilityRange());

      if (!isMounted) {
        return;
      }

      if (!result.success) {
        setAvailabilityError(result.error);
        setCalDays([]);
        setIsLoadingAvailability(false);
        return;
      }

      setCalDays(toCalendarDays(result.days));
      setIsLoadingAvailability(false);
    };

    void loadAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  const update = (key: keyof FormState, value: string): void => {
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

  const focusFirstInvalidField = (errors: Partial<Record<keyof FormState, string>>): void => {
    const firstInvalidKey = Object.keys(errors)[0];

    if (!firstInvalidKey) {
      return;
    }

    const field = formRef.current?.querySelector<HTMLElement>(
      `[data-field="${firstInvalidKey}"] input, [data-field="${firstInvalidKey}"] button`,
    );

    field?.focus({ preventScroll: true });
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const validateForm = (): Partial<Record<keyof FormState, string>> => {
    const errors: Partial<Record<keyof FormState, string>> = {};

    Object.entries(requiredFieldMessages).forEach(([field, message]) => {
      const key = field as keyof FormState;

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

    const clientErrors = validateForm();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      focusFirstInvalidField(clientErrors);
      return;
    }

    if (!selectedDate || !selectedTime || !selectedSlot) {
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
      selectedDate: selectedSlot.date,
      selectedTime,
      startsAt: selectedSlot.startsAt,
      endsAt: selectedSlot.endsAt,
      timezone: selectedSlot.timezone,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error);
      setValidationErrors(result.validationErrors ?? {});
      return;
    }

    if (result.meetingBookingStatus === 'CONFIRMED') {
      setSuccessTitle('Reunião marcada com sucesso!');
      setSuccessMessage(
        result.message ??
          'A sua reunião foi confirmada e adicionada ao calendário. Enviámos também o convite por email.',
      );
      removeSelectedSlotFromAvailability(selectedSlot);
    } else {
      setSuccessTitle('Pedido de reunião recebido!');
      setSuccessMessage(
        result.message ??
          result.warning ??
          'Recebemos o seu pedido, mas não foi possível confirmar automaticamente a reunião. A equipa da Norm8 irá entrar em contacto.',
      );
    }

    setSubmitted(true);
  };

  /**
   * Removes the confirmed slot from the current browser state after Google
   * Calendar accepts the event, avoiding stale availability in the UI.
   *
   * @param slot Confirmed meeting slot.
   */
  const removeSelectedSlotFromAvailability = (slot: AvailableMeetingSlot): void => {
    setCalDays((currentDays) =>
      currentDays.map((day) => {
        if (toDateKey(day.date) !== slot.date) {
          return day;
        }

        const slots = day.slots.filter(
          (availableSlot) => availableSlot.startsAt !== slot.startsAt,
        );

        return {
          ...day,
          available: slots.length > 0,
          slots,
        };
      }),
    );
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

  const selectedDay = selectedDate
    ? calDays.find((day) => day.date.toDateString() === selectedDate.toDateString())
    : undefined;
  const selectedDaySlots = selectedDay?.slots ?? [];
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
              noValidate
              ref={formRef}
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
                              setSelectedSlot(null);
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
                        {selectedDaySlots.map((slot) => (
                          <button
                            key={slot.startsAt}
                            type="button"
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setSelectedSlot(slot);
                            }}
                            style={{
                              padding: '8px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 500,
                              border:
                                selectedSlot?.startsAt === slot.startsAt
                                  ? `1px solid ${BLUE}`
                                  : `1px solid ${BORDER}`,
                              backgroundColor:
                                selectedSlot?.startsAt === slot.startsAt
                                  ? 'rgba(37,99,235,0.2)'
                                  : SURFACE2,
                              color:
                                selectedSlot?.startsAt === slot.startsAt
                                  ? '#fff'
                                  : '#E8EDF8',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>

                      {!isLoadingAvailability && selectedDaySlots.length === 0 && (
                        <p
                          style={{
                            color: MUTED,
                            fontSize: 12,
                            marginTop: 12,
                          }}
                        >
                          Sem horários disponíveis neste dia.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {isLoadingAvailability && (
                    <p
                      style={{
                        color: MUTED,
                        fontSize: 12,
                        marginTop: 20,
                      }}
                    >
                      A carregar horários disponíveis...
                    </p>
                  )}

                  {availabilityError && (
                    <p
                      style={{
                        color: '#fecaca',
                        fontSize: 12,
                        marginTop: 20,
                      }}
                    >
                      {availabilityError}
                    </p>
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
                    {fields.map((field) => {
                      const error = fieldErrors[field.k];
                      const errorId = 'meeting-' + field.k + '-error';

                      return (
                        <div data-field={field.k} key={field.k}>
                          <label style={labelStyle}>{field.l}</label>

                          <input
                            aria-describedby={error ? errorId : undefined}
                            aria-invalid={Boolean(error)}
                            type={field.type}
                            placeholder={field.ph}
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

                    <div data-field="objetivo">
                      <label style={labelStyle}>Objetivo da Reunião *</label>
                      <Norm8Select
                        ariaRequired
                        error={Boolean(fieldErrors.objetivo)}
                        errorId="meeting-objetivo-error"
                        options={meetingGoals}
                        value={form.objetivo}
                        onValueChange={(value) => update('objetivo', value)}
                        placeholder="Selecionar objetivo..."
                      />
                      <FieldError
                        id="meeting-objetivo-error"
                        message={fieldErrors.objetivo}
                      />
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
                    disabled={
                      isSubmitting ||
                      !selectedDate ||
                      !selectedTime ||
                      !selectedSlot ||
                      Boolean(availabilityError)
                    }
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
                        selectedDate &&
                        selectedTime &&
                        selectedSlot &&
                        !availabilityError &&
                        !isSubmitting
                          ? 'pointer'
                          : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity:
                        !selectedDate || !selectedTime || !selectedSlot
                          ? 0.5
                          : 1,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(event) => {
                      if (selectedDate && selectedTime && selectedSlot) {
                        event.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity =
                        !selectedDate || !selectedTime || !selectedSlot
                          ? '0.5'
                          : '1';
                    }}
                  >
                    {isSubmitting ? 'A enviar...' : 'Marcar Reunião'}{' '}
                    <ArrowRight size={16} />
                  </button>

                  {(!selectedDate || !selectedTime || !selectedSlot) && (
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
                {successTitle}
              </h3>

              <p
                style={{
                  fontSize: 16,
                  color: MUTED,
                }}
              >
                {successMessage}
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
