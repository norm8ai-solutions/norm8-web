import type { ContractDeliverableStatus, ContractPhaseType, ContractPlan, ContractSectionCategory, ContractServiceType, ContractStatus, PaymentMilestoneStatus } from '@/app/generated/prisma/client';

export type ContractDocumentParty = {
  legalName: string | null;
  tradeName: string | null;
  taxId: string | null;
  address: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  representative: string | null;
  representativeRole: string | null;
  representativeEmail?: string | null;
};

export type ContractDocumentSection = {
  id: string;
  title: string;
  category: ContractSectionCategory;
  content: string;
  order: number;
  isRequired: boolean;
};

export type ContractDocumentDeliverable = {
  id: string;
  title: string;
  description: string | null;
  phase: ContractPhaseType | null;
  status: ContractDeliverableStatus;
  estimatedDate: Date | null;
  responsible: string | null;
  acceptanceCriteria: string | null;
};

export type ContractDocumentPhase = {
  id: string;
  name: string;
  phaseType: ContractPhaseType | null;
  order: number;
  startsAt: Date | null;
  endsAt: Date | null;
  duration: string | null;
  description: string | null;
  dependencies: string | null;
  paymentMilestone: string | null;
  approvalCriteria: string | null;
  deliverables: ContractDocumentDeliverable[];
};

export type ContractDocumentPayment = {
  id: string;
  percentage: string | null;
  amount: string | null;
  currency: string;
  invoiceMoment: string | null;
  expectedDate: Date | null;
  description: string | null;
  status: PaymentMilestoneStatus;
  billingCondition: string | null;
};

export type ContractDocumentFinancials = {
  currency: string;
  commercialValue: string | null;
  discount: string | null;
  finalValue: string | null;
  vatRate: string | null;
  valueWithVat: string | null;
  taxStatus: string | null;
  proposalValidity: string | null;
  paymentDueDate: string | null;
  paymentPlan: string | null;
  specialCondition: string | null;
  operateMonthlyFee: string | null;
  operatePeriodicity: string | null;
  operateFreeMonths: string | null;
  operateBillingStartDate: string | null;
  operateMinimumStay: string | null;
  operateNoticePeriod: string | null;
  operateAutoRenewal: boolean;
  setupFee: string | null;
  thirdPartyCosts: string | null;
};

export type ContractDocumentData = {
  id: string;
  number: string;
  title: string;
  version: number;
  status: ContractStatus;
  issueDate: Date | null;
  validUntil: Date | null;
  pdfUrl: string | null;
  pdfStorageKey: string | null;
  pdfHash: string | null;
  generatedAt: Date | null;
  updatedAt: Date;
  pendingChangeReason: string | null;
  pendingChangeAt: Date | null;
  projectName: string | null;
  serviceType: ContractServiceType | null;
  serviceTypeOther: string | null;
  plan: ContractPlan | null;
  includesLaunch: boolean;
  includesOperate: boolean;
  includesScale: boolean;
  includedServices: string[];
  client: ContractDocumentParty;
  provider: ContractDocumentParty;
  context: {
    executiveSummary: string | null;
    projectObjective: string | null;
    identifiedProblems: string | null;
    proposedSolution: string | null;
    includedScope: string | null;
    excludedScope: string | null;
    dependencies: string | null;
    assumptions: string | null;
    acceptanceCriteria: string | null;
    implementationPlan: string | null;
    nextSteps: string | null;
  };
  proposal: {
    id: string;
    title: string;
    pdfUrl: string | null;
  } | null;
  lead: {
    id: string;
    company: string;
    email: string;
  } | null;
  sections: ContractDocumentSection[];
  phases: ContractDocumentPhase[];
  deliverables: ContractDocumentDeliverable[];
  payments: ContractDocumentPayment[];
  financials: ContractDocumentFinancials;
  warnings: string[];
};

export type ContractRenderedPage = {
  id: string;
  sectionId: string;
  title: string;
  pageNumber: number;
  showPageNumber: boolean;
  isContinuation?: boolean;
};
