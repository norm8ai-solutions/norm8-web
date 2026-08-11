/**
 * ------------------------------------------------------------------
 * File: lib/admin/commercial-next-action.ts
 * Description: Central decision helper for Base Offer, Discovery and Proposal next actions.
 * ------------------------------------------------------------------
 */

export type LeadCommercialFlowStage =
  | 'WAITING_PRE_MEETING_SUBMISSION'
  | 'BASE_OFFER_CREATED'
  | 'DISCOVERY_IN_PREPARATION'
  | 'DISCOVERY_COMPLETED'
  | 'FINAL_PROPOSAL_CREATED'
  | 'BASE_OFFER_ARCHIVED';

export type LeadCommercialFlowAction = {
  type: 'link' | 'form' | 'external';
  label: string;
  href?: string;
};

export type LeadCommercialFlowState = {
  stage: LeadCommercialFlowStage;
  label: string;
  description: string;
  primaryAction?: LeadCommercialFlowAction;
  secondaryActions: LeadCommercialFlowAction[];
};

type LeadCommercialFlowStateInput = {
  baseOfferStatus?: string | null;
  discoverySessionStatus?: string | null;
  finalProposalId?: string | null;
  finalProposalPdfHref?: string | null;
  leadId: string;
};

export function getLeadCommercialFlowState(input: LeadCommercialFlowStateInput): LeadCommercialFlowState {
  const discoveryHref = '/admin/leads/' + input.leadId + '/discovery';

  if (input.finalProposalId) {
    return {
      stage: 'FINAL_PROPOSAL_CREATED',
      label: 'Proposta Final criada',
      description: 'Já existe uma proposta comercial associada a esta Lead.',
      primaryAction: {
        type: 'link',
        label: 'Ver Proposta Final',
        href: '/admin/proposals/' + input.finalProposalId,
      },
      secondaryActions: input.finalProposalPdfHref
        ? [{ type: 'external', label: 'Ver PDF', href: input.finalProposalPdfHref }]
        : [],
    };
  }

  if (!input.baseOfferStatus) {
    return {
      stage: 'WAITING_PRE_MEETING_SUBMISSION',
      label: 'Aguardar submissão pré-reunião',
      description: 'A Oferta Base será criada automaticamente após a submissão do formulário pré-reunião.',
      primaryAction: { type: 'form', label: 'Enviar pedido pré-reunião' },
      secondaryActions: [],
    };
  }

  if (input.baseOfferStatus === 'ARCHIVED') {
    return {
      stage: 'BASE_OFFER_ARCHIVED',
      label: 'Arquivada',
      description: 'Esta Oferta Base foi arquivada e não tem uma ação comercial principal ativa.',
      secondaryActions: [],
    };
  }

  if (input.baseOfferStatus === 'CONVERTED_TO_PROPOSAL') {
    return {
      stage: 'FINAL_PROPOSAL_CREATED',
      label: 'Proposta Final criada',
      description: 'A Oferta Base está marcada como convertida, mas não foi encontrada uma proposta ativa associada.',
      secondaryActions: [{ type: 'link', label: 'Rever Discovery', href: discoveryHref }],
    };
  }

  if (input.discoverySessionStatus === 'COMPLETED' || input.baseOfferStatus === 'DISCOVERY_COMPLETED' || input.baseOfferStatus === 'VALIDATED') {
    return {
      stage: 'DISCOVERY_COMPLETED',
      label: 'Discovery concluída',
      description: 'A Lead já tem informação validada para preparar a Proposta Final.',
      primaryAction: { type: 'form', label: 'Gerar Proposta Final' },
      secondaryActions: [{ type: 'link', label: 'Rever Discovery', href: discoveryHref }],
    };
  }

  if (input.discoverySessionStatus === 'IN_PROGRESS' || input.discoverySessionStatus === 'DRAFT' || input.baseOfferStatus === 'DISCOVERY_PREPARATION') {
    return {
      stage: 'DISCOVERY_IN_PREPARATION',
      label: 'Discovery em preparação',
      description: 'A reunião está a ser preparada ou já tem dados em validação.',
      primaryAction: { type: 'link', label: 'Continuar Discovery', href: discoveryHref },
      secondaryActions: [],
    };
  }

  return {
    stage: 'BASE_OFFER_CREATED',
    label: 'Oferta Base criada',
    description: 'Rascunho interno criado para preparar a reunião de discovery.',
    primaryAction: { type: 'link', label: 'Preparar Discovery', href: discoveryHref },
    secondaryActions: [],
  };
}

export type BaseOfferPrimaryActionType =
  | 'PREPARE_DISCOVERY'
  | 'CONTINUE_DISCOVERY'
  | 'GENERATE_FINAL_PROPOSAL'
  | 'VIEW_FINAL_PROPOSAL'
  | 'NONE';

export type BaseOfferPrimaryAction = {
  type: BaseOfferPrimaryActionType;
  label: string;
  href?: string;
  needsWarning?: boolean;
};

type BaseOfferPrimaryActionInput = {
  baseOfferStatus?: string | null;
  discoverySessionStatus?: string | null;
  finalProposalId?: string | null;
  hasDiscoverySession?: boolean;
  hasFinalProposal?: boolean;
  leadId: string;
};

export function getBaseOfferPrimaryAction(input: BaseOfferPrimaryActionInput): BaseOfferPrimaryAction {
  const hasFinalProposal = Boolean(input.hasFinalProposal || input.finalProposalId);

  if (hasFinalProposal && input.finalProposalId) {
    return {
      type: 'VIEW_FINAL_PROPOSAL',
      label: 'Ver Proposta Final',
      href: `/admin/proposals/${input.finalProposalId}`,
    };
  }

  if (input.baseOfferStatus === 'CONVERTED_TO_PROPOSAL') {
    return {
      type: 'VIEW_FINAL_PROPOSAL',
      label: 'Ver Proposta Final',
    };
  }

  if (input.discoverySessionStatus === 'COMPLETED' || input.baseOfferStatus === 'DISCOVERY_COMPLETED' || input.baseOfferStatus === 'VALIDATED') {
    return {
      type: 'GENERATE_FINAL_PROPOSAL',
      label: 'Gerar Proposta Final',
    };
  }

  if (input.hasDiscoverySession || input.baseOfferStatus === 'DISCOVERY_PREPARATION') {
    return {
      type: 'CONTINUE_DISCOVERY',
      label: 'Continuar Discovery',
      href: `/admin/leads/${input.leadId}/discovery`,
      needsWarning: true,
    };
  }

  if (input.baseOfferStatus) {
    return {
      type: 'PREPARE_DISCOVERY',
      label: 'Preparar Discovery',
      href: `/admin/leads/${input.leadId}/discovery`,
    };
  }

  return { type: 'NONE', label: '' };
}
