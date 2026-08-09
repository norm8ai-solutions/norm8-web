'use client';

import { useActionState } from 'react';
import { Sparkles } from 'lucide-react';
import { Norm8Select } from '@/components/ui/norm8-select';
import { activitySectorOptions } from '@/lib/forms/activity-sectors';
import {
  submitLegalDataIntakeAction,
  submitPreMeetingIntakeAction,
  type PublicIntakeActionState,
} from '@/lib/manual-client-intake/actions';
import styles from './ManualClientIntake.module.css';

const initialState: PublicIntakeActionState = { success: false };

type InvitePrefill = {
  valid: boolean;
  token?: string;
  contactName?: string;
  email?: string;
  companyName?: string;
  phone?: string | null;
  error?: string;
};

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  wide?: boolean;
  hint?: string;
  errors?: string[];
  defaultValue?: string | null;
  placeholder?: string;
};

type FormSectionProps = {
  children: React.ReactNode;
};

export function PreMeetingIntakeForm({ invite }: { invite?: InvitePrefill }) {
  const [state, formAction, pending] = useActionState(submitPreMeetingIntakeAction, initialState);

  return (
    <form action={formAction} className={styles.clientIntakeCard} noValidate>
      {invite && !invite.valid && invite.error ? (
        <p className={styles.clientIntakeNotice}>
          O link personalizado expirou ou é inválido. Pode preencher o formulário normalmente.
        </p>
      ) : null}
      {invite?.valid && invite.token ? <input name="token" type="hidden" value={invite.token} /> : null}

      <Honeypot />

      <FormSection>
        <Field
          label="Nome do contacto"
          name="contactName"
          required
          defaultValue={invite?.contactName}
          errors={state.validationErrors?.contactName}
          placeholder="Nome e apelido"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={invite?.email}
          errors={state.validationErrors?.email}
          placeholder="nome@empresa.pt"
        />
        <Field
          label="Telefone"
          name="phone"
          type="tel"
          required
          defaultValue={invite?.phone}
          errors={state.validationErrors?.phone}
          placeholder="+351 912 345 678"
        />
        <Field
          label="Nome da empresa"
          name="companyName"
          required
          defaultValue={invite?.companyName}
          errors={state.validationErrors?.companyName}
          placeholder="Empresa, Lda."
        />
      </FormSection>

      <FormSection>
        <Field
          label="Website ou redes sociais"
          name="websiteOrSocials"
          errors={state.validationErrors?.websiteOrSocials}
          placeholder="https://empresa.pt ou LinkedIn"
        />
        <SelectField
          label="Setor de Atividade"
          name="businessArea"
          required
          errors={state.validationErrors?.businessArea}
          options={activitySectorOptions}
          placeholder="Selecionar setor..."
        />
      </FormSection>

      <FormSection>
        <Field
          label="Principal problema"
          name="mainProblem"
          textarea
          wide
          required
          errors={state.validationErrors?.mainProblem}
          placeholder="Explique o problema operacional ou comercial que mais importa resolver."
        />
        <Field
          label="Processo a automatizar"
          name="processToAutomate"
          textarea
          wide
          required
          errors={state.validationErrors?.processToAutomate}
          placeholder="Descreva o processo, etapas e pessoas envolvidas."
        />
        <Field
          label="Ferramentas atuais"
          name="currentTools"
          textarea
          wide
          required
          errors={state.validationErrors?.currentTools}
          placeholder="Ex.: Excel, email, CRM, WhatsApp, software interno."
        />
        <Field
          label="Objetivo da solução"
          name="solutionObjective"
          textarea
          wide
          required
          errors={state.validationErrors?.solutionObjective}
          placeholder="Que resultado espera alcançar com automação ou IA?"
        />
        <Field
          label="Notas adicionais"
          name="notes"
          textarea
          wide
          errors={state.validationErrors?.notes}
          placeholder="Partilhe qualquer detalhe que ajude a preparar a reunião."
        />
      </FormSection>

      <FormFooter
        pending={pending}
        state={state}
        submitLabel="Enviar informações"
        pendingLabel="A enviar informações..."
      />
    </form>
  );
}

export function LegalDataIntakeForm({ token }: { token?: string }) {
  const [state, formAction, pending] = useActionState(submitLegalDataIntakeAction, initialState);

  return (
    <form action={formAction} className={styles.clientIntakeCard}>
      {token ? <input name="token" type="hidden" value={token} /> : null}
      {state.success && state.message ? <p className={styles.clientIntakeSuccess}>{state.message}</p> : null}
      <div className={styles.clientIntakeGrid}>
        <Honeypot />
        <Field label="Nome legal da empresa" name="companyLegalName" required errors={state.validationErrors?.companyLegalName} />
        <Field label="NIF" name="nif" required errors={state.validationErrors?.nif} />
        <Field label="Morada fiscal" name="fiscalAddress" wide required errors={state.validationErrors?.fiscalAddress} />
        <Field label="Código postal" name="postalCode" required errors={state.validationErrors?.postalCode} />
        <Field label="Localidade" name="city" required errors={state.validationErrors?.city} />
        <Field label="País" name="country" required errors={state.validationErrors?.country} />
        <Field label="Nome do representante legal" name="legalRepresentativeName" required errors={state.validationErrors?.legalRepresentativeName} />
        <Field label="Cargo do representante legal" name="legalRepresentativeTitle" required errors={state.validationErrors?.legalRepresentativeTitle} />
        <Field label="Email do representante legal" name="legalRepresentativeEmail" type="email" required errors={state.validationErrors?.legalRepresentativeEmail} />
        <Field label="Email de faturação" name="billingEmail" type="email" required errors={state.validationErrors?.billingEmail} />
        <Field label="Telefone de faturação" name="billingPhone" type="tel" errors={state.validationErrors?.billingPhone} />
        <Field label="Preferência para segunda reunião" name="preferredSecondMeetingTime" errors={state.validationErrors?.preferredSecondMeetingTime} />
        <Field label="Ferramentas principais necessárias" name="mainToolsNeeded" textarea wide errors={state.validationErrors?.mainToolsNeeded} />
        <Field label="Contacto técnico" name="technicalContact" wide errors={state.validationErrors?.technicalContact} />
        <Field label="Notas legais ou de faturação" name="legalNotes" textarea wide errors={state.validationErrors?.legalNotes} />
        <label className={styles.clientIntakeConsent}>
          <input name="interestConfirmation" type="checkbox" required />
          <span>Confirmo que existe interesse em avançar para os próximos passos comerciais com a Norm8.</span>
        </label>
        <label className={styles.clientIntakeConsent}>
          <input name="consent" type="checkbox" required />
          <span>Autorizo a Norm8 a tratar estes dados para proposta, faturação, preparação contratual e onboarding. Não estou a enviar passwords, credenciais ou tokens de acesso.</span>
        </label>
      </div>
      <FormFooter
        pending={pending}
        state={state}
        submitLabel="Enviar dados legais"
        pendingLabel="A enviar..."
        showIcon
        statusLabel="Não envie passwords, credenciais, tokens de acesso ou dados sensíveis neste formulário."
      />
    </form>
  );
}

function FormSection({ children }: FormSectionProps) {
  return <div className={styles.clientIntakeGrid}>{children}</div>;
}
function SelectField({ label, name, required, errors, options, placeholder }: {
  label: string;
  name: string;
  required?: boolean;
  errors?: string[];
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div className={styles.clientIntakeField}>
      <span className={styles.clientIntakeLabel}>{label}</span>
      <Norm8Select
        ariaRequired={required}
        buttonClassName="h-[47px] min-h-[47px] rounded-[10px] border-[#182034] bg-[#0d1526] px-4 py-0"
        error={hasError}
        errorId={errorId}
        name={name}
        options={options}
        placeholder={placeholder}
      />
      {hasError ? <span className={styles.clientIntakeError} id={errorId}>{errors?.[0]}</span> : null}
    </div>
  );
}

function Field({ label, name, type = 'text', required, textarea, wide, hint, errors, defaultValue, placeholder }: FieldProps) {
  const className = wide ? `${styles.clientIntakeField} ${styles.clientIntakeFieldWide}` : styles.clientIntakeField;
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <label className={className}>
      <span className={styles.clientIntakeLabel}>{label}</span>
      {textarea ? (
        <textarea
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError || undefined}
          className={styles.clientIntakeTextarea}
          defaultValue={defaultValue ?? undefined}
          name={name}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError || undefined}
          className={styles.clientIntakeInput}
          defaultValue={defaultValue ?? undefined}
          name={name}
          placeholder={placeholder}
          required={required}
          type={type}
        />
      )}
      {hint ? <span className={styles.clientIntakeHint}>{hint}</span> : null}
      {hasError ? <span className={styles.clientIntakeError} id={errorId}>{errors?.[0]}</span> : null}
    </label>
  );
}

function Honeypot() {
  return (
    <label className={styles.clientIntakeHoneypot} aria-hidden="true">
      Website da empresa
      <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
    </label>
  );
}

function FormFooter({ pending, state, submitLabel, pendingLabel, showIcon, statusLabel }: {
  pending: boolean;
  state: PublicIntakeActionState;
  submitLabel: string;
  pendingLabel: string;
  showIcon?: boolean;
  statusLabel?: string;
}) {
  return (
    <div className={styles.clientIntakeActions}>
      <button className={styles.clientIntakeButton} disabled={pending} type="submit">
        {showIcon ? <Sparkles aria-hidden="true" size={18} /> : null}
        {pending ? pendingLabel : submitLabel}
      </button>
      {!state.success && state.error ? <span className={styles.clientIntakeError}>{state.error}</span> : null}
      {statusLabel ? <span className={styles.clientIntakeStatus}>{statusLabel}</span> : null}
    </div>
  );
}
