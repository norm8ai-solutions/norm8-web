import type {
  ContractActivityType,
  ContractPlan,
  ContractSectionCategory,
  ContractServiceType,
  ContractStatus,
} from '@/app/generated/prisma/client';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em revisao',
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
  PROCESS_AUTOMATION: 'Automacao de processos',
  AI_AGENTS: 'Agentes de IA',
  SYSTEM_INTEGRATION: 'Integracao de sistemas',
  TECHNOLOGY_CONSULTING: 'Consultoria tecnologica',
  COMMERCIAL_PLATFORM: 'Plataforma comercial',
  MAINTENANCE_EVOLUTION: 'Manutencao e evolucao',
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
  SCOPE: 'Ambito',
  RESPONSIBILITIES: 'Responsabilidades',
  TIMELINE: 'Cronograma',
  APPROVALS: 'Aprovacoes',
  SCOPE_CHANGE: 'Alteracoes de ambito',
  PAYMENTS: 'Pagamentos',
  DELAYS: 'Atrasos',
  SUSPENSION: 'Suspensao',
  OPERATE: 'Operate',
  SLA: 'SLA',
  WARRANTY: 'Garantia',
  INTELLECTUAL_PROPERTY: 'Propriedade intelectual',
  CONFIDENTIALITY: 'Confidencialidade',
  DATA_PROTECTION: 'Protecao de dados',
  THIRD_PARTY_SERVICES: 'Servicos de terceiros',
  LIABILITY_LIMITATION: 'Limitacao de responsabilidade',
  TERMINATION: 'Rescisao',
  FORCE_MAJEURE: 'Forca maior',
  COMMUNICATIONS: 'Comunicacoes',
  APPLICABLE_LAW: 'Lei aplicavel',
  JURISDICTION: 'Foro',
  SIGNATURES: 'Assinaturas',
  ANNEX: 'Anexo',
};

export const CONTRACT_ACTIVITY_LABELS: Record<ContractActivityType, string> = {
  CONTRACT_CREATED: 'Contrato criado',
  CONTRACT_UPDATED: 'Contrato atualizado',
  CONTRACT_STATUS_CHANGED: 'Estado alterado',
  CONTRACT_VERSION_CREATED: 'Versao criada',
  CONTRACT_PDF_GENERATION_REQUESTED: 'Geracao de PDF solicitada',
  CONTRACT_SENT: 'Contrato enviado',
  CONTRACT_DRAFT_UPDATED: 'Rascunho atualizado',
  CONTRACT_CLIENT_UPDATED: 'Cliente atualizado',
  CONTRACT_SERVICE_UPDATED: 'Servico atualizado',
  CONTRACT_SCOPE_UPDATED: 'Ambito atualizado',
  CONTRACT_TIMELINE_UPDATED: 'Cronograma atualizado',
  CONTRACT_FINANCIALS_UPDATED: 'Dados financeiros atualizados',
  CONTRACT_CLAUSES_UPDATED: 'Clausulas atualizadas',
  CONTRACT_REVIEW_SAVED: 'Revisao guardada',
};

export const CONTRACT_SERVICE_TYPES = Object.keys(CONTRACT_SERVICE_TYPE_LABELS) as ContractServiceType[];
export const CONTRACT_PLANS = Object.keys(CONTRACT_PLAN_LABELS) as ContractPlan[];

export const INCLUDED_SERVICE_OPTIONS = [
  'Discovery',
  'Arquitetura',
  'UI/UX',
  'Desenvolvimento',
  'Implementacao',
  'Integracoes',
  'Testes',
  'Publicacao',
  'Formacao',
  'Suporte',
  'Analytics',
  'SEO',
  'Automacoes',
  'CRM',
  'Dashboards',
  'Agentes IA',
  'Manutencao',
  'Evolucao continua',
] as const;

export const PAYMENT_PLAN_OPTIONS = [
  { value: 'SINGLE', label: 'Pagamento unico' },
  { value: '50_50', label: '50% / 50%' },
  { value: '30_30_40', label: '30% / 30% / 40%' },
  { value: 'CUSTOM', label: 'Plano personalizado' },
] as const;

export const PHASE_PRESETS = [
  'Discovery e arquitetura',
  'Implementacao base',
  'Automacao e integracoes',
  'Validacao e lancamento',
  'Operate e melhoria continua',
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