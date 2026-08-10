/**
 * ------------------------------------------------------------------
 * File: lib/admin/commercial-next-action.ts
 * Description: Central decision helper for Base Offer, Discovery and Proposal next actions.
 * ------------------------------------------------------------------
 */

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