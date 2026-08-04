'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { Send, X } from 'lucide-react';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8PhoneInput, isNormalizedPhoneValid } from '@/components/ui/norm8-phone-input';
import { Norm8Select, type Norm8SelectOption } from '@/components/ui/norm8-select';
import PreMeetingInviteEmail, { PRE_MEETING_INVITE_SUBJECT } from '@/lib/email/templates/PreMeetingInviteEmail';
import {
  sendPreMeetingInviteRequestAction,
  type PreMeetingInviteActionState,
} from '@/lib/manual-client-intake/actions';

type SendPreMeetingIntakeRequestModalProps = {
  defaultContactName?: string | null;
  defaultEmail?: string | null;
  defaultCompanyName?: string | null;
  defaultPhone?: string | null;
  leadId?: string;
  triggerLabel?: string;
};

type ManualInviteRequestFormProps = {
  defaultCompanyName?: string | null;
  defaultContactName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  defaultSource: string;
  leadId?: string;
  onNewRequest: () => void;
};

type InvitePreview = {
  companyName: string;
  contactName: string;
  email: string;
  formUrl: string;
  linkReady: boolean;
  source: string;
};

type InviteValidationField = 'contactName' | 'email' | 'companyName' | 'phone' | 'source' | 'meetingAt';
type InviteFieldErrors = Partial<Record<InviteValidationField, string>>;

const initialState: PreMeetingInviteActionState = { success: false };
const requiredInviteMessages: Record<Exclude<InviteValidationField, 'email' | 'meetingAt' | 'phone'>, string> = {
  contactName: 'Nome do contacto é obrigatório.',
  companyName: 'Nome da empresa é obrigatório.',
  source: 'Origem é obrigatório.',
};
const invalidEmailMessage = 'Insira um email válido.';
const invalidPhoneMessage = 'Insira um número de telefone válido.';
const pastMeetingAtMessage = 'A data/hora combinada não pode estar no passado.';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sourceOptions: Norm8SelectOption[] = [
  { value: 'Boca a boca', label: 'Boca a boca' },
  { value: 'Cold call', label: 'Cold call' },
  { value: 'Referência', label: 'Referência' },
  { value: 'Outro', label: 'Outro' },
];
const directFormUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://norm8.pt').replace(/\/$/, '')}/clientes/pre-reuniao`;

export function SendPreMeetingIntakeRequestModal({
  defaultCompanyName,
  defaultContactName,
  defaultEmail,
  defaultPhone,
  leadId,
  triggerLabel = 'Enviar pedido pré-reunião',
}: SendPreMeetingIntakeRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [useInitialDefaults, setUseInitialDefaults] = useState(true);

  const openModal = () => {
    setUseInitialDefaults(true);
    setFormKey((currentKey) => currentKey + 1);
    setOpen(true);
  };

  const startNewRequest = () => {
    setUseInitialDefaults(false);
    setFormKey((currentKey) => currentKey + 1);
  };

  return (
    <>
      <button className="admin-button" type="button" onClick={openModal}>
        <Send size={14} />
        {triggerLabel}
      </button>
      {open ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal manual-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="pre-meeting-invite-title">
            <div className="admin-modal-header manual-invite-header">
              <div>
                <h2 id="pre-meeting-invite-title">Enviar pedido pré-reunião</h2>
                <p>Cria ou reutiliza uma Lead e envia o link direto para o formulário.</p>
              </div>
              <button className="admin-icon-button manual-invite-close-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            <ManualInviteRequestForm
              key={formKey}
              defaultCompanyName={useInitialDefaults ? defaultCompanyName : null}
              defaultContactName={useInitialDefaults ? defaultContactName : null}
              defaultEmail={useInitialDefaults ? defaultEmail : null}
              defaultPhone={useInitialDefaults ? defaultPhone : null}
              defaultSource={useInitialDefaults ? 'Boca a boca' : ''}
              leadId={useInitialDefaults ? leadId : undefined}
              onNewRequest={startNewRequest}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ManualInviteRequestForm({
  defaultCompanyName,
  defaultContactName,
  defaultEmail,
  defaultPhone,
  defaultSource,
  leadId,
  onNewRequest,
}: ManualInviteRequestFormProps) {
  const [contactName, setContactName] = useState(defaultContactName ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? '');
  const [source, setSource] = useState(defaultSource);
  const [phone, setPhone] = useState('');
  const [meetingAt, setMeetingAt] = useState<Date | null>(null);
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [state, formAction, pending] = useActionState(sendPreMeetingInviteRequestAction, initialState);
  const sent = state.success;
  const fieldsLocked = pending || sent;
  const hasGeneratedLink = Boolean(state.formUrl);
  const emailFailedWithLink = hasGeneratedLink && state.emailSent === false;
  const hasActiveFieldErrors = Object.keys(fieldErrors).length > 0;
  const showGlobalError = !state.success && Boolean(state.error) && (!state.validationErrors || hasActiveFieldErrors);
  const copyButtonLabel = !hasGeneratedLink
    ? 'Link gerado após envio'
    : copyState === 'copied'
      ? 'Link copiado'
      : copyState === 'error'
        ? 'Não foi possível copiar'
        : emailFailedWithLink
          ? 'Copiar link para envio manual'
          : 'Copiar link personalizado';

  useEffect(() => {
    if (state.success) {
      setFieldErrors({});
      return;
    }

    if (!state.validationErrors) {
      return;
    }

    setFieldErrors(getActionFieldErrors(state.validationErrors));
  }, [state.success, state.validationErrors]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => setCopyState('idle'), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const validateAndApplyField = (field: InviteValidationField, value: string, showError: boolean): void => {
    const error = validateInviteField(field, value);

    setFieldErrors((currentErrors) => {
      if (!error) {
        if (!currentErrors[field]) {
          return currentErrors;
        }

        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      }

      if (!showError) {
        return currentErrors;
      }

      return { ...currentErrors, [field]: error };
    });
  };

  const updateValidatedField = (field: InviteValidationField, value: string): void => {
    if (field === 'contactName') {
      setContactName(value);
    } else if (field === 'email') {
      setEmail(value);
    } else if (field === 'companyName') {
      setCompanyName(value);
    } else {
      setSource(value);
    }

    validateAndApplyField(field, value, false);
  };

  const validateFieldOnBlur = (field: InviteValidationField, value: string): void => {
    validateAndApplyField(field, value, true);
  };

  const validateBeforeSubmit = (event: FormEvent<HTMLFormElement>): void => {
    const nextErrors = validateInviteForm({ contactName, email, companyName, phone, source, meetingAt: meetingAt?.toISOString() ?? '' });

    if (Object.keys(nextErrors).length === 0) {
      return;
    }

    event.preventDefault();
    setFieldErrors(nextErrors);
  };

  const copyGeneratedLink = async () => {
    if (!state.formUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.formUrl);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const preview = useMemo<InvitePreview>(() => {
    const displayName = contactName.trim() || '[Nome]';
    const displayCompany = companyName.trim() || '[Empresa]';
    return {
      companyName: displayCompany,
      contactName: displayName,
      email: email.trim() || 'email@empresa.pt',
      formUrl: state.formUrl ?? 'O link personalizado será gerado no envio.',
      linkReady: Boolean(state.formUrl),
      source,
    };
  }, [contactName, companyName, email, source, state.formUrl]);

  return (
    <form action={formAction} className="manual-invite-form-shell" noValidate onSubmit={validateBeforeSubmit}>
      {leadId ? <input name="leadId" type="hidden" value={leadId} /> : null}
      <div className="manual-invite-modal-grid">
        <section className="manual-invite-editor-panel" aria-labelledby="manual-invite-details-title">
          <div className="manual-invite-section-card">
            <div className="manual-invite-section-heading">
              <h3 id="manual-invite-details-title">Dados do pedido</h3>
              <p>Preencha os dados principais para criar ou reutilizar a Lead e enviar o formulário pré-reunião.</p>
            </div>
            <div className="manual-invite-fields">
              <Field disabled={fieldsLocked} label="Nome do contacto" name="contactName" value={contactName} onChange={(value) => updateValidatedField('contactName', value)} onBlur={() => validateFieldOnBlur('contactName', contactName)} error={fieldErrors.contactName} />
              <Field disabled={fieldsLocked} label="Email" name="email" type="email" value={email} onChange={(value) => updateValidatedField('email', value)} onBlur={() => validateFieldOnBlur('email', email)} error={fieldErrors.email} />
              <Field autoCapitalize="off" autoCorrect="off" disabled={fieldsLocked} label="Nome da empresa" name="companyName" spellCheck={false} value={companyName} onChange={(value) => updateValidatedField('companyName', value)} onBlur={() => validateFieldOnBlur('companyName', companyName)} error={fieldErrors.companyName} />
              <label className="manual-invite-field">
                <span>Telefone</span>
                <Norm8PhoneInput
                  defaultValue={defaultPhone}
                  disabled={fieldsLocked}
                  error={Boolean(fieldErrors.phone)}
                  errorId="manual-invite-phone-error"
                  name="phone"
                  onBlur={() => validateFieldOnBlur('phone', phone)}
                  onValueChange={(value) => {
                    setPhone(value.normalizedValue);
                    validateAndApplyField('phone', value.normalizedValue, false);
                  }}
                />
                <small className="manual-invite-field-error" id="manual-invite-phone-error" aria-hidden={!fieldErrors.phone}>{fieldErrors.phone ?? '\u00A0'}</small>
              </label>
              <label className="manual-invite-field">
                <span>Origem</span>
                <Norm8Select
                  buttonClassName="manual-invite-picker-trigger"
                  disabled={fieldsLocked}
                  error={Boolean(fieldErrors.source)}
                  errorId="manual-invite-source-error"
                  name="source"
                  onBlur={() => validateFieldOnBlur('source', source)}
                  onValueChange={(value) => updateValidatedField('source', value)}
                  options={sourceOptions}
                  value={source}
                />
                <small className="manual-invite-field-error" id="manual-invite-source-error" aria-hidden={!fieldErrors.source}>{fieldErrors.source ?? '\u00A0'}</small>
              </label>
              <label className="manual-invite-field">
                <span>Data/hora combinada</span>
                <Norm8DateTimePicker
                  buttonClassName="manual-invite-picker-trigger"
                  disabled={fieldsLocked}
                  disablePast
                  error={Boolean(fieldErrors.meetingAt)}
                  errorId="manual-invite-meetingAt-error"
                  name="meetingAt"
                  onValueChange={(value) => {
                    setMeetingAt(value);
                    validateAndApplyField('meetingAt', value?.toISOString() ?? '', false);
                  }}
                  placeholder="Selecionar data e hora"
                  value={meetingAt}
                />
                <small className="manual-invite-field-error" id="manual-invite-meetingAt-error" aria-hidden={!fieldErrors.meetingAt}>{fieldErrors.meetingAt ?? '\u00A0'}</small>
              </label>
              <label className="manual-invite-field manual-invite-wide manual-invite-note-field">
                <span>Nota interna</span>
                <textarea className="admin-textarea manual-invite-note" disabled={fieldsLocked} name="note" />
                <small className="manual-invite-field-error" aria-hidden="true">{'\u00A0'}</small>
              </label>
            </div>
          </div>

          <div className="manual-invite-state-stack" aria-live="polite">
            {state.success ? <p className="manual-invite-success">{state.message}</p> : null}
            {showGlobalError ? <p className="manual-invite-error">{state.error}</p> : null}
            {state.warning ? <p className="manual-invite-error">{state.warning}</p> : null}
            {state.success ? <p className="manual-invite-link-state">Link enviado: {preview.formUrl}</p> : null}
          </div>
        </section>

        <PreMeetingEmailPreview preview={preview} />
      </div>

      <div className="manual-invite-actions">
        <button className="admin-button admin-button-muted" type="button" disabled={!hasGeneratedLink} onClick={copyGeneratedLink}>
          {copyButtonLabel}
        </button>
        {sent ? (
          <button className="admin-button" type="button" onClick={onNewRequest}>
            Enviar novo pedido
          </button>
        ) : (
          <button className="admin-button" disabled={pending} type="submit">
            {pending ? 'A enviar pedido...' : 'Enviar pedido pré-reunião'}
          </button>
        )}
      </div>
    </form>
  );
}

function PreMeetingEmailPreview({ preview }: { preview: InvitePreview }) {
  return (
    <section className="admin-email-preview manual-invite-email-preview" aria-label="Pré-visualização do email final">
      <div className="admin-email-preview-toolbar">
        <div>
          <strong>Pré-visualização do email final com branding Norm8</strong>
          <span>Renderizado com o mesmo template visual usado no envio real.</span>
        </div>
        <span className="admin-email-preview-recipient">Para: {preview.email}</span>
      </div>

      <dl className="manual-invite-preview-meta">
        <div><dt>Assunto</dt><dd>{PRE_MEETING_INVITE_SUBJECT}</dd></div>
        <div><dt>Empresa</dt><dd>{preview.companyName}</dd></div>
        <div><dt>Contacto</dt><dd>{preview.contactName}</dd></div>
        <div><dt>Link</dt><dd>{preview.formUrl}</dd></div>
      </dl>

      <div className="admin-email-preview-scroll manual-invite-preview-scroll">
        <div className="admin-email-preview-canvas manual-invite-preview-canvas">
          <PreMeetingInviteEmail contactName={preview.contactName} companyName={preview.companyName} formUrl={preview.linkReady ? preview.formUrl : directFormUrl} />
        </div>
      </div>
    </section>
  );
}

function Field({
  autoCapitalize,
  autoCorrect,
  defaultValue,
  disabled = false,
  error,
  label,
  name,
  onChange,
  onBlur,
  required = true,
  spellCheck,
  type = 'text',
  value,
  wide = false,
}: {
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  autoCorrect?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: string;
  label: string;
  name: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  required?: boolean;
  spellCheck?: boolean;
  type?: string;
  value?: string;
  wide?: boolean;
}) {
  const errorId = error ? `manual-invite-${name}-error` : undefined;

  return (
    <label className={wide ? 'manual-invite-field manual-invite-wide' : 'manual-invite-field'}>
      <span>{label}</span>
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error) || undefined}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        className={error ? 'admin-input manual-invite-control admin-input-error' : 'admin-input manual-invite-control'}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        name={name}
        required={required}
        spellCheck={spellCheck}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      <small className="manual-invite-field-error" id={errorId} aria-hidden={!error}>{error ?? '\u00A0'}</small>
    </label>
  );
}
function validateInviteField(field: InviteValidationField, value: string): string | undefined {
  const trimmedValue = value.trim();

  if (field === 'email') {
    return emailPattern.test(trimmedValue) ? undefined : invalidEmailMessage;
  }


  if (field === 'phone') {
    return isNormalizedPhoneValid(trimmedValue) ? undefined : invalidPhoneMessage;
  }

  if (field === 'meetingAt') {
    if (!trimmedValue) {
      return undefined;
    }

    const parsedDate = new Date(trimmedValue);
    return Number.isFinite(parsedDate.getTime()) && parsedDate > new Date()
      ? undefined
      : pastMeetingAtMessage;
  }

  return trimmedValue ? undefined : requiredInviteMessages[field];
}

function validateInviteForm(values: Record<InviteValidationField, string>): InviteFieldErrors {
  return (Object.keys(values) as InviteValidationField[]).reduce<InviteFieldErrors>((errors, field) => {
    const error = validateInviteField(field, values[field]);

    if (error) {
      errors[field] = error;
    }

    return errors;
  }, {});
}

function getActionFieldErrors(validationErrors: Record<string, string[]>): InviteFieldErrors {
  const inviteFields: InviteValidationField[] = ['contactName', 'email', 'companyName', 'phone', 'source', 'meetingAt'];

  return inviteFields.reduce<InviteFieldErrors>((errors, field) => {
    const message = validationErrors[field]?.[0];

    if (message) {
      errors[field] = message;
    }

    return errors;
  }, {});
}
