'use client';

import { useActionState } from 'react';
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
};

export function PreMeetingIntakeForm({ invite }: { invite?: InvitePrefill }) {
  const [state, formAction, pending] = useActionState(submitPreMeetingIntakeAction, initialState);

  return (
    <form action={formAction} className={styles.clientIntakeCard}>
      {invite && !invite.valid && invite.error ? (
        <p className={styles.clientIntakeError}>{invite.error} Pode preencher o formulário sem associação automática.</p>
      ) : null}
      {invite?.valid && invite.token ? <input name="token" type="hidden" value={invite.token} /> : null}
      {state.success && state.message ? <p className={styles.clientIntakeSuccess}>{state.message}</p> : null}
      <div className={styles.clientIntakeGrid}>
        <Honeypot />
        <Field label="Nome do contacto" name="contactName" required defaultValue={invite?.contactName} errors={state.validationErrors?.contactName} />
        <Field label="Email" name="email" type="email" required defaultValue={invite?.email} errors={state.validationErrors?.email} />
        <Field label="Telefone" name="phone" type="tel" required defaultValue={invite?.phone} errors={state.validationErrors?.phone} />
        <Field label="Nome da empresa" name="companyName" required defaultValue={invite?.companyName} errors={state.validationErrors?.companyName} />
        <Field label="Website ou redes sociais" name="websiteOrSocials" errors={state.validationErrors?.websiteOrSocials} />
        <Field label="Área de negócio" name="businessArea" required errors={state.validationErrors?.businessArea} />
        <Field label="Principal problema" name="mainProblem" textarea wide required errors={state.validationErrors?.mainProblem} />
        <Field label="Processo a automatizar" name="processToAutomate" textarea wide required errors={state.validationErrors?.processToAutomate} />
        <Field label="Ferramentas atuais" name="currentTools" textarea wide required errors={state.validationErrors?.currentTools} />
        <Field label="Objetivo da solução" name="solutionObjective" textarea wide required errors={state.validationErrors?.solutionObjective} />
        <Field label="Notas adicionais" name="notes" textarea wide errors={state.validationErrors?.notes} />
        <label className={styles.clientIntakeConsent}>
          <input name="consent" type="checkbox" required />
          <span>Autorizo a Norm8 a usar estes dados para análise comercial e preparação da reunião. Não estou a enviar passwords, credenciais ou tokens de acesso.</span>
        </label>
      </div>
      <FormFooter pending={pending} state={state} submitLabel="Enviar informação" pendingLabel="A enviar..." />
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
      <FormFooter pending={pending} state={state} submitLabel="Enviar dados legais" pendingLabel="A enviar..." />
    </form>
  );
}

function Field({ label, name, type = 'text', required, textarea, wide, hint, errors, defaultValue }: FieldProps) {
  const className = wide ? `${styles.clientIntakeField} ${styles.clientIntakeFieldWide}` : styles.clientIntakeField;
  const errorId = `${name}-error`;

  return (
    <label className={className}>
      <span className={styles.clientIntakeLabel}>{label}</span>
      {textarea ? (
        <textarea className={styles.clientIntakeTextarea} name={name} required={required} defaultValue={defaultValue ?? undefined} aria-describedby={errors?.length ? errorId : undefined} />
      ) : (
        <input className={styles.clientIntakeInput} name={name} type={type} required={required} defaultValue={defaultValue ?? undefined} aria-describedby={errors?.length ? errorId : undefined} />
      )}
      {hint ? <span className={styles.clientIntakeHint}>{hint}</span> : null}
      {errors?.length ? <span className={styles.clientIntakeError} id={errorId}>{errors[0]}</span> : null}
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

function FormFooter({ pending, state, submitLabel, pendingLabel }: {
  pending: boolean;
  state: PublicIntakeActionState;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <div className={styles.clientIntakeActions}>
      <button className={styles.clientIntakeButton} disabled={pending} type="submit">
        {pending ? pendingLabel : submitLabel}
      </button>
      {!state.success && state.error ? <span className={styles.clientIntakeError}>{state.error}</span> : null}
      <span className={styles.clientIntakeStatus}>Resposta sem marcação automática de reunião.</span>
    </div>
  );
}