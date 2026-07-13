import type { LeadActionType } from '@/app/generated/prisma/client';

export type LeadActionExecutionKind =
  | 'scheduleMeeting'
  | 'prepareEmail'
  | 'openSubmission'
  | 'createProposal'
  | 'registerCall'
  | 'closeLost'
  | 'registerGenericExecution';

export type LeadActionExecutionConfig = {
  description: string;
  kind: LeadActionExecutionKind;
  label: string;
  tone: 'primary' | 'muted' | 'danger';
};

const executionConfigByType: Record<LeadActionType, LeadActionExecutionConfig> = {
  SCHEDULE_MEETING: {
    kind: 'scheduleMeeting',
    label: 'Agendar reunião',
    description: 'Cria uma reunião associada à lead e regista o evento na timeline.',
    tone: 'primary',
  },
  SEND_EMAIL: {
    kind: 'prepareEmail',
    label: 'Enviar email',
    description: 'Revê a mensagem e envia um email real à lead.',
    tone: 'primary',
  },
  FOLLOW_UP: {
    kind: 'prepareEmail',
    label: 'Enviar follow-up',
    description: 'Revê a mensagem e envia um follow-up real à lead.',
    tone: 'primary',
  },
  REVIEW_AUDIT: {
    kind: 'openSubmission',
    label: 'Abrir submissão',
    description: 'Abre a submissão ou auditoria associada para revisão manual.',
    tone: 'muted',
  },
  SEND_PROPOSAL: {
    kind: 'createProposal',
    label: 'Criar proposta',
    description: 'Revê e ajusta os dados antes de gerar a proposta comercial.',
    tone: 'primary',
  },
  CALL: {
    kind: 'registerCall',
    label: 'Registar chamada',
    description: 'Regista o resultado da chamada na timeline da lead.',
    tone: 'muted',
  },
  CLOSE_LOST: {
    kind: 'closeLost',
    label: 'Fechar como perdida',
    description: 'Pede confirmação, atualiza a lead como perdida e conclui esta ação.',
    tone: 'danger',
  },
  OTHER: {
    kind: 'registerGenericExecution',
    label: 'Registar execução',
    description: 'Regista uma nota de execução na timeline e conclui a ação.',
    tone: 'muted',
  },
};

export function getLeadActionExecutionConfig(
  type: LeadActionType,
): LeadActionExecutionConfig {
  return executionConfigByType[type];
}