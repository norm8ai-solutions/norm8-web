import type {
  ContractActivityType,
  ContractPlan,
  ContractSectionCategory,
  ContractServiceType,
  ContractStatus,
} from '@/app/generated/prisma/client';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em revisão',
  READY_TO_SEND: 'Pronto para envio',
  SENT: 'Enviado',
  VIEWED: 'Visualizado',
  AWAITING_SIGNATURE: 'A aguardar assinatura',
  SIGNED: 'Assinado',
  REJECTED: 'Recusado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

export const CONTRACT_SERVICE_TYPE_LABELS: Record<ContractServiceType, string> = {
  WEBSITE: 'Website',
  CUSTOM_SOFTWARE: 'Software personalizado',
  PROCESS_AUTOMATION: 'Automação de processos',
  AI_AGENTS: 'Agentes de IA',
  SYSTEM_INTEGRATION: 'Integração de sistemas',
  TECHNOLOGY_CONSULTING: 'Consultoria tecnológica',
  COMMERCIAL_PLATFORM: 'Plataforma comercial',
  MAINTENANCE_EVOLUTION: 'Manutenção e evolução',
  OTHER: 'Outro',
};

export const CONTRACT_PLAN_LABELS: Record<ContractPlan, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  BUSINESS: 'Business',
  CUSTOM: 'Personalizado',
};

export const CONTRACT_SECTION_CATEGORY_LABELS: Record<ContractSectionCategory, string> = {
  OBJECT: 'Objeto',
  SCOPE: 'Âmbito',
  RESPONSIBILITIES: 'Responsabilidades',
  TIMELINE: 'Cronograma',
  APPROVALS: 'Aprovações',
  SCOPE_CHANGE: 'Alterações de âmbito',
  PAYMENTS: 'Pagamentos',
  DELAYS: 'Atrasos',
  SUSPENSION: 'Suspensão',
  OPERATE: 'Operate',
  SLA: 'SLA',
  WARRANTY: 'Garantia',
  INTELLECTUAL_PROPERTY: 'Propriedade intelectual',
  CONFIDENTIALITY: 'Confidencialidade',
  DATA_PROTECTION: 'Proteção de dados',
  THIRD_PARTY_SERVICES: 'Serviços de terceiros',
  LIABILITY_LIMITATION: 'Limitação de responsabilidade',
  TERMINATION: 'Rescisão',
  FORCE_MAJEURE: 'Força maior',
  COMMUNICATIONS: 'Comunicações',
  APPLICABLE_LAW: 'Lei aplicável',
  JURISDICTION: 'Foro',
  SIGNATURES: 'Assinaturas',
  ANNEX: 'Anexo',
};

export const CONTRACT_ACTIVITY_LABELS: Record<ContractActivityType, string> = {
  CONTRACT_CREATED: 'Contrato criado',
  CONTRACT_UPDATED: 'Contrato atualizado',
  CONTRACT_STATUS_CHANGED: 'Estado alterado',
  CONTRACT_VERSION_CREATED: 'Versão criada',
  CONTRACT_PDF_GENERATION_REQUESTED: 'Geração de PDF solicitada',
  CONTRACT_SENT: 'Contrato enviado',
  CONTRACT_DRAFT_UPDATED: 'Rascunho atualizado',
  CONTRACT_CLIENT_UPDATED: 'Cliente atualizado',
  CONTRACT_SERVICE_UPDATED: 'Serviço atualizado',
  CONTRACT_SCOPE_UPDATED: 'Âmbito atualizado',
  CONTRACT_TIMELINE_UPDATED: 'Cronograma atualizado',
  CONTRACT_FINANCIALS_UPDATED: 'Dados financeiros atualizados',
  CONTRACT_CLAUSES_UPDATED: 'Cláusulas atualizadas',
  CONTRACT_REVIEW_SAVED: 'Revisão guardada',
};

export const CONTRACT_SERVICE_TYPES = Object.keys(CONTRACT_SERVICE_TYPE_LABELS) as ContractServiceType[];
export const CONTRACT_PLANS = Object.keys(CONTRACT_PLAN_LABELS) as ContractPlan[];

export const INCLUDED_SERVICE_OPTIONS = [
  'Discovery',
  'Arquitetura',
  'UI/UX',
  'Desenvolvimento',
  'Implementação',
  'Integrações',
  'Testes',
  'Publicação',
  'Formação',
  'Suporte',
  'Analytics',
  'SEO',
  'Automações',
  'CRM',
  'Dashboards',
  'Agentes IA',
  'Manutenção',
  'Evolução contínua',
] as const;

export const PAYMENT_PLAN_OPTIONS = [
  { value: 'SINGLE', label: 'Pagamento único' },
  { value: '50_50', label: '50% / 50%' },
  { value: '30_30_40', label: '30% / 30% / 40%' },
  { value: 'CUSTOM', label: 'Plano personalizado' },
] as const;

export const PHASE_PRESETS = [
  'Discovery e arquitetura',
  'Implementação base',
  'Automação e integrações',
  'Validação e lançamento',
  'Operate e melhoria contínua',
] as const;

export const CONTRACT_VARIABLES = [
  '{{client.companyName}}',
  '{{client.taxId}}',
  '{{provider.legalName}}',
  '{{contract.number}}',
  '{{contract.date}}',
  '{{project.name}}',
  '{{financial.total}}',
  '{{financial.currency}}',
  '{{payment.initialPercentage}}',
  '{{operate.monthlyFee}}',
  '{{operate.noticePeriod}}',
] as const;