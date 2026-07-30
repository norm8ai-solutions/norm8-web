'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { Send, X } from 'lucide-react';
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

const initialState: PreMeetingInviteActionState = { success: false };
const subject = 'Informações para preparar a nossa reunião — Norm8';
const directFormUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://norm8.pt').replace(/\/$/, '')}/clientes/pre-reuniao`;

export function SendPreMeetingIntakeRequestModal({
  defaultCompanyName,
  defaultContactName,
  defaultEmail,
  defaultPhone,
  leadId,
  triggerLabel = 'Enviar pedido pré-reunião',
}: SendPreMeetingIntakeRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState(defaultContactName ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? '');
  const [source, setSource] = useState('Boca a boca');
  const [state, formAction, pending] = useActionState(sendPreMeetingInviteRequestAction, initialState);
  const preview = useMemo(() => ({ contactName, email, companyName, source }), [contactName, email, companyName, source]);

  return (
    <>
      <button className="admin-button" type="button" onClick={() => setOpen(true)}>
        <Send size={14} />
        {triggerLabel}
      </button>
      {open ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="pre-meeting-invite-title">
            <div className="admin-modal-header">
              <div>
                <h2 id="pre-meeting-invite-title">Enviar pedido pré-reunião</h2>
                <p>Cria ou reutiliza uma Lead e envia o link direto para o formulário.</p>
              </div>
              <button className="admin-icon-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form action={formAction} className="manual-invite-modal-grid" noValidate>
              {leadId ? <input name="leadId" type="hidden" value={leadId} /> : null}
              <div className="manual-invite-fields">
                <Field label="Nome do contacto" name="contactName" value={contactName} onChange={setContactName} error={state.validationErrors?.contactName?.[0]} />
                <Field label="Email" name="email" type="email" value={email} onChange={setEmail} error={state.validationErrors?.email?.[0]} />
                <Field label="Nome da empresa" name="companyName" value={companyName} onChange={setCompanyName} error={state.validationErrors?.companyName?.[0]} />
                <Field label="Telefone" name="phone" defaultValue={defaultPhone ?? ''} error={state.validationErrors?.phone?.[0]} required={false} />
                <label className="manual-invite-field">
                  <span>Origem</span>
                  <select className="admin-input" name="source" value={source} onChange={(event) => setSource(event.target.value)}>
                    <option>Boca a boca</option>
                    <option>Cold call</option>
                    <option>Referência</option>
                    <option>Outro</option>
                  </select>
                  {state.validationErrors?.source?.[0] ? <small>{state.validationErrors.source[0]}</small> : null}
                </label>
                <label className="manual-invite-field manual-invite-wide">
                  <span>Nota interna</span>
                  <textarea className="admin-textarea" name="note" />
                </label>
                <Field label="Data/hora combinada" name="meetingAt" type="datetime-local" required={false} error={state.validationErrors?.meetingAt?.[0]} />
                <Field label="Link/local da reunião" name="meetingLocation" required={false} error={state.validationErrors?.meetingLocation?.[0]} />
              </div>

              <aside className="manual-invite-preview">
                <h3>Preview do email</h3>
                <dl>
                  <div><dt>Destinatário</dt><dd>{preview.email || 'email@empresa.pt'}</dd></div>
                  <div><dt>Assunto</dt><dd>{subject}</dd></div>
                  <div><dt>Nome</dt><dd>{preview.contactName || 'Nome do contacto'}</dd></div>
                  <div><dt>Empresa</dt><dd>{preview.companyName || 'Empresa'}</dd></div>
                  <div><dt>Origem</dt><dd>{preview.source}</dd></div>
                  <div><dt>Link</dt><dd>{state.formUrl ?? directFormUrl}</dd></div>
                </dl>
                <p>O template é fixo nesta fase para manter consistência na comunicação.</p>
                {state.success ? <p className="manual-invite-success">{state.message}</p> : null}
                {!state.success && state.error ? <p className="manual-invite-error">{state.error}</p> : null}
                {state.warning ? <p className="manual-invite-error">{state.warning}</p> : null}
                <button className="admin-button admin-button-muted" type="button" onClick={() => navigator.clipboard?.writeText(state.formUrl ?? directFormUrl)}>
                  Copiar link do formulário
                </button>
              </aside>

              <div className="manual-invite-actions">
                <button className="admin-button" disabled={pending} type="submit">
                  {pending ? 'A enviar...' : 'Enviar pedido'}
                </button>
                <button className="admin-button admin-button-muted" type="button" onClick={() => setOpen(false)}>
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  defaultValue,
  error,
  label,
  name,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="manual-invite-field">
      <span>{label}</span>
      <input
        className="admin-input"
        defaultValue={value === undefined ? defaultValue : undefined}
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}
