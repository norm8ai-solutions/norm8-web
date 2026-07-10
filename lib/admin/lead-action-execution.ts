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
    label: 'Preparar email',
    description: 'Guarda um rascunho operacional no módulo de emails.',
    tone: 'primary',
  },
  FOLLOW_UP: {
    kind: 'prepareEmail',
    label: 'Preparar follow-up',
    description: 'Prepara um email de seguimento editável antes de contactar a lead.',
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
    description: 'Regista a intenção de proposta sem simular geração automática.',
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