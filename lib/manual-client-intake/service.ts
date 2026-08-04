import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { createProposal } from '@/lib/proposals/service';
import { sendManualIntakeEmails, sendPreMeetingInviteEmail } from './email';

const requiredText = (label: string) => z.string().trim().min(1, `${label} é obrigatório.`);
const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const emailSchema = z.string().trim().email('Insira um email válido.').toLowerCase();
const invalidPhoneMessage = 'Insira um número de telefone válido.';
const pastMeetingAtMessage = 'A data/hora combinada não pode estar no passado.';
const websiteOrSocialSchema = z.string().trim().optional().transform((value) => value || undefined);
const consentSchema = z.literal('on', { message: 'O consentimento é obrigatório.' });
const honeypotSchema = z.string().trim().max(0, 'Pedido inválido.').optional().or(z.literal(''));

export const preMeetingIntakeSchema = z.object({
  contactName: requiredText('Nome do contacto'),
  email: emailSchema,
  phone: requiredText('Telefone'),
  companyName: requiredText('Nome da empresa'),
  websiteOrSocials: websiteOrSocialSchema,
  businessArea: requiredText('Área de negócio'),
  mainProblem: requiredText('Principal problema'),
  processToAutomate: requiredText('Processo a automatizar'),
  currentTools: requiredText('Ferramentas atuais'),
  solutionObjective: requiredText('Objetivo da solução'),
  notes: optionalText,
  consent: consentSchema,
  companyWebsite: honeypotSchema,
  token: optionalText,
});


export const preMeetingInviteRequestSchema = z.object({
  leadId: optionalText,
  contactName: requiredText('Nome do contacto'),
  email: emailSchema,
  companyName: requiredText('Nome da empresa'),
  phone: optionalText,
  source: requiredText('Origem'),
  note: optionalText,
  meetingAt: optionalText,
}).superRefine((value, context) => {
  if (value.phone && !isPreMeetingInvitePhoneValid(value.phone)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: invalidPhoneMessage,
      path: ['phone'],
    });
  }

  if (!value.meetingAt) {
    return;
  }

  const meetingAt = new Date(value.meetingAt);

  if (!Number.isFinite(meetingAt.getTime()) || meetingAt <= new Date()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: pastMeetingAtMessage,
      path: ['meetingAt'],
    });
  }
});
export const legalDataIntakeSchema = z.object({
  token: optionalText,
  companyLegalName: requiredText('Nome legal da empresa'),
  nif: requiredText('NIF'),
  fiscalAddress: requiredText('Morada fiscal'),
  postalCode: requiredText('Código postal'),
  city: requiredText('Localidade'),
  country: requiredText('País'),
  legalRepresentativeName: requiredText('Nome do representante legal'),
  legalRepresentativeTitle: requiredText('Cargo do representante legal'),
  legalRepresentativeEmail: emailSchema,
  billingEmail: emailSchema,
  billingPhone: optionalText,
  legalNotes: optionalText,
  preferredSecondMeetingTime: optionalText,
  mainToolsNeeded: optionalText,
  technicalContact: optionalText,
  interestConfirmation: consentSchema,
  consent: consentSchema,
  companyWebsite: honeypotSchema,
});

export const baseOfferUpdateSchema = z.object({
  baseOfferId: requiredText('Base offer'),
  problemSummary: optionalText,
  processToAutomate: optionalText,
  suggestedSolution: optionalText,
  toolsMentioned: optionalText,
  estimatedScope: optionalText,
  initialPriceRange: optionalText,
  pricingRationale: optionalText,
  nextSteps: optionalText,
});

export const discoveryNotesSchema = z.object({
  baseOfferId: requiredText('Base offer'),
  confirmedProblems: optionalText,
  newProblems: optionalText,
  currentProcess: optionalText,
  impact: optionalText,
  tools: optionalText,
  decisionMakers: optionalText,
  urgency: optionalText,
  budget: optionalText,
  validatedSolution: optionalText,
  discardedFeatures: optionalText,
  priceDiscussed: optionalText,
  nextSteps: optionalText,
  expectedSecondMeetingDate: optionalText,
});

export type PreMeetingIntakeInput = z.infer<typeof preMeetingIntakeSchema>;
export type PreMeetingInviteRequestInput = z.infer<typeof preMeetingInviteRequestSchema>;
export type LegalDataIntakeInput = z.infer<typeof legalDataIntakeSchema>;
export type ManualIntakeResult =
  | { success: true; leadId: string; submissionId: string; baseOfferId?: string; message: string }
  | { success: false; error: string; validationErrors?: Record<string, string[]> };

export function parsePreMeetingFormData(formData: FormData) {
  return preMeetingIntakeSchema.safeParse(formDataToObject(formData));
}


export function parsePreMeetingInviteRequestFormData(formData: FormData) {
  return preMeetingInviteRequestSchema.safeParse(formDataToObject(formData));
}
export function parseLegalDataFormData(formData: FormData) {
  return legalDataIntakeSchema.safeParse(formDataToObject(formData));
}


export type PreMeetingInviteRequestResult =
  | {
      success: true;
      leadId: string;
      inviteId: string;
      formUrl: string;
      emailSent: boolean;
      emailLogId?: string;
      message: string;
      warning?: string;
    }
  | { success: false; error: string; validationErrors?: Record<string, string[]> };

export type PreMeetingInviteTokenState =
  | {
      valid: true;
      token: string;
      contactName: string;
      email: string;
      companyName: string;
      phone?: string | null;
    }
  | { valid: false; error?: string };

export async function createPreMeetingInviteRequest(input: PreMeetingInviteRequestInput): Promise<PreMeetingInviteRequestResult> {
  try {
    const leadMatch = buildLeadMatch(input.email, input.companyName);
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = addDays(new Date(), 30);
    const formUrl = getPreMeetingFormUrl(token);
    const meetingAt = parseOptionalDate(input.meetingAt);

    const result = await prisma.$transaction(async (tx) => {
      const explicitLead = input.leadId
        ? await tx.lead.findUnique({ where: { id: input.leadId } })
        : null;
      const existingLead = explicitLead ?? await findMatchingLead(tx, leadMatch);
      const lead = existingLead
        ? await tx.lead.update({
            where: { id: existingLead.id },
            data: {
              name: existingLead.name || input.contactName,
              company: existingLead.company || input.companyName,
              email: existingLead.email || input.email,
              phone: existingLead.phone || input.phone,
              normalizedCompany: existingLead.normalizedCompany || leadMatch.normalizedCompany,
              normalizedEmail: existingLead.normalizedEmail || leadMatch.normalizedEmail,
              source: existingLead.source || normalizeInviteSource(input.source),
            },
          })
        : await tx.lead.create({
            data: {
              name: input.contactName,
              company: input.companyName,
              email: input.email,
              phone: input.phone,
              normalizedCompany: leadMatch.normalizedCompany,
              normalizedEmail: leadMatch.normalizedEmail,
              source: normalizeInviteSource(input.source),
              priority: 'MEDIUM',
            },
          });

      const invite = await tx.manualIntakeInvite.create({
        data: {
          leadId: lead.id,
          tokenHash,
          email: input.email,
          contactName: input.contactName,
          companyName: input.companyName,
          source: input.source,
          note: input.note,
          meetingAt,
          expiresAt,
          status: 'DRAFT',
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'PRE_MEETING_INTAKE_REQUEST_CREATED',
          message: 'Pedido de informações pré-reunião criado no Admin.',
          metadata: {
            inviteId: invite.id,
            source: input.source,
            meetingAt: meetingAt?.toISOString() ?? null,
          },
        },
      });


      await tx.notification.create({
        data: {
          title: `Pedido pré-reunião preparado: ${lead.company}`,
          message: 'Foi criado um registo interno para recolha de informações pré-reunião.',
          type: 'PRE_MEETING_INTAKE_REQUEST',
          relatedLeadId: lead.id,
        },
      });

      return { lead, invite };
    });

    const emailResult = await sendPreMeetingInviteEmail({
      leadId: result.lead.id,
      inviteId: result.invite.id,
      to: input.email,
      contactName: input.contactName,
      companyName: input.companyName,
      formUrl,
    });

    await prisma.manualIntakeInvite.update({
      where: { id: result.invite.id },
      data: {
        status: emailResult.success ? 'SENT' : 'DRAFT',
        sentAt: emailResult.success ? new Date() : null,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: result.lead.id,
        type: 'PRE_MEETING_INTAKE_REQUEST_SENT',
        message: emailResult.success
          ? 'Email com pedido de informações pré-reunião enviado ao cliente.'
          : 'Pedido de informações pré-reunião criado, mas o email não foi enviado pelo provider.',
        metadata: {
          inviteId: result.invite.id,
          emailLogId: emailResult.emailLogId ?? null,
          formUrl,
          emailSent: emailResult.success,
          error: emailResult.error ?? null,
        },
      },
    });

    return {
      success: true,
      leadId: result.lead.id,
      inviteId: result.invite.id,
      formUrl,
      emailSent: emailResult.success,
      emailLogId: emailResult.emailLogId,
      message: emailResult.success
        ? 'Pedido pré-reunião enviado com sucesso.'
        : 'Convite criado, mas o email não foi enviado. Copie o link e envie manualmente.',
      warning: emailResult.success ? undefined : emailResult.error,
    };
  } catch (error) {
    console.error('Failed to create pre-meeting invite request', error);
    return { success: false, error: 'Não foi possível criar o pedido pré-reunião neste momento.' };
  }
}

export async function getPreMeetingInviteTokenState(token?: string): Promise<PreMeetingInviteTokenState> {
  const invite = await getUsablePreMeetingInvite(token);
  if (!invite) {
    return token ? { valid: false, error: 'Link inválido ou expirado.' } : { valid: false };
  }

  return {
    valid: true,
    token: token ?? '',
    contactName: invite.contactName,
    email: invite.email,
    companyName: invite.companyName ?? invite.lead.company,
    phone: invite.lead.phone,
  };
}
export async function submitPreMeetingIntake(input: PreMeetingIntakeInput): Promise<ManualIntakeResult> {
  if (input.companyWebsite) {
    return { success: false, error: 'Pedido inválido.' };
  }

  try {
    const payload = buildPreMeetingPayload(input);
    const leadMatch = buildLeadMatch(input.email, input.companyName, input.websiteOrSocials);
    const baseOfferDraft = buildBaseOfferDraft(input);
    const invite = await getUsablePreMeetingInvite(input.token) ?? await getPendingPreMeetingInviteForSubmission(input.email, input.companyName);

    const result = await prisma.$transaction(async (tx) => {
      const existingLead = invite?.lead ?? await findMatchingLead(tx, leadMatch);
      const lead = existingLead
        ? await tx.lead.update({
            where: { id: existingLead.id },
            data: {
              name: existingLead.name || input.contactName,
              company: existingLead.company || input.companyName,
              email: existingLead.email || input.email,
              phone: existingLead.phone || input.phone,
              website: existingLead.website || input.websiteOrSocials,
              normalizedCompany: existingLead.normalizedCompany || leadMatch.normalizedCompany,
              normalizedWebsite: existingLead.normalizedWebsite || leadMatch.normalizedWebsite,
              normalizedEmail: existingLead.normalizedEmail || leadMatch.normalizedEmail,
              source: existingLead.source || 'manual/pre-meeting intake',
              priority: existingLead.priority === 'LOW' ? 'MEDIUM' : existingLead.priority,
            },
          })
        : await tx.lead.create({
            data: {
              name: input.contactName,
              company: input.companyName,
              email: input.email,
              phone: input.phone,
              website: input.websiteOrSocials,
              normalizedCompany: leadMatch.normalizedCompany,
              normalizedWebsite: leadMatch.normalizedWebsite,
              normalizedEmail: leadMatch.normalizedEmail,
              source: 'manual/pre-meeting intake',
              priority: 'HIGH',
            },
          });

      const submission = await tx.submission.create({
        data: {
          leadId: lead.id,
          type: 'PRE_MEETING_INTAKE',
          payload,
          notes: input.notes,
        },
      });

      const baseOffer = await tx.baseOffer.create({
        data: {
          leadId: lead.id,
          submissionId: submission.id,
          ...baseOfferDraft,
        },
      });

      await tx.leadActivity.createMany({
        data: [
          {
            leadId: lead.id,
            type: 'PRE_MEETING_INTAKE_RECEIVED',
            message: 'Questionário pré-discovery recebido pelo formulário manual oculto.',
            metadata: { submissionId: submission.id, inviteId: invite?.id ?? null, source: 'manual/pre-meeting intake' },
          },
          {
            leadId: lead.id,
            type: 'BASE_OFFER_CREATED',
            message: 'Oferta Base interna criada automaticamente a partir do questionário pré-discovery.',
            metadata: { submissionId: submission.id, baseOfferId: baseOffer.id, inviteId: invite?.id ?? null },
          },
        ],
      });

      if (invite) {
        await tx.manualIntakeInvite.update({
          where: { id: invite.id },
          data: { status: 'SUBMITTED', submittedAt: new Date() },
        });
      }

      await tx.notification.create({
        data: {
          title: `Nova pré-discovery: ${lead.company}`,
          message: `${lead.name ?? 'Contacto'} submeteu dados para preparação comercial manual.`,
          type: 'MANUAL_CLIENT_INTAKE',
          relatedLeadId: lead.id,
          relatedSubmissionId: submission.id,
        },
      });

      return { lead, submission, baseOffer };
    });

    await sendManualIntakeEmails({
      kind: 'preMeeting',
      lead: result.lead,
      submissionId: result.submission.id,
      payload,
    });

    return {
      success: true,
      leadId: result.lead.id,
      submissionId: result.submission.id,
      baseOfferId: result.baseOffer.id,
      message: 'Recebemos a informação. A equipa Norm8 vai usá-la para preparar a reunião de diagnóstico.',
    };
  } catch (error) {
    console.error('Failed to submit pre-meeting intake', error);
    return { success: false, error: 'Não foi possível registar os dados neste momento. Tente novamente dentro de instantes.' };
  }
}

export async function submitLegalDataIntake(input: LegalDataIntakeInput): Promise<ManualIntakeResult> {
  if (input.companyWebsite) {
    return { success: false, error: 'Pedido inválido.' };
  }

  try {
    const payload = buildLegalPayload(input);
    const result = await prisma.$transaction(async (tx) => {
      const lead = await findLeadForLegalData(tx, input) ?? await tx.lead.create({
        data: {
          name: input.legalRepresentativeName,
          company: input.companyLegalName,
          email: input.legalRepresentativeEmail,
          phone: input.billingPhone,
          normalizedCompany: normalizeCompany(input.companyLegalName),
          normalizedEmail: normalizeEmail(input.legalRepresentativeEmail),
          source: 'manual/legal data intake',
          priority: 'HIGH',
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          company: input.companyLegalName,
          email: lead.email || input.legalRepresentativeEmail,
          phone: lead.phone || input.billingPhone,
          normalizedCompany: normalizeCompany(input.companyLegalName),
          normalizedEmail: normalizeEmail(lead.email || input.legalRepresentativeEmail),
        },
      });

      const submission = await tx.submission.create({
        data: {
          leadId: updatedLead.id,
          type: 'LEGAL_DATA_INTAKE',
          payload,
          notes: input.legalNotes,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: updatedLead.id,
          type: 'LEGAL_DATA_INTAKE_RECEIVED',
          message: 'Dados legais e de faturação recebidos pelo formulário manual oculto.',
          metadata: { submissionId: submission.id, tokenProvided: Boolean(input.token) },
        },
      });

      await tx.leadAction.create({
        data: {
          leadId: updatedLead.id,
          type: 'FOLLOW_UP',
          title: 'Preparar segunda reunião/onboarding',
          description: buildLegalChecklistDescription(input),
          status: 'PENDING',
        },
      });


      await tx.notification.create({
        data: {
          title: `Dados legais recebidos: ${updatedLead.company}`,
          message: 'Validar dados legais, proposta final e preparação contratual antes de avançar.',
          type: 'LEGAL_DATA_INTAKE',
          relatedLeadId: updatedLead.id,
          relatedSubmissionId: submission.id,
        },
      });

      return { lead: updatedLead, submission };
    });

    await sendManualIntakeEmails({
      kind: 'legalData',
      lead: result.lead,
      submissionId: result.submission.id,
      payload,
    });

    return {
      success: true,
      leadId: result.lead.id,
      submissionId: result.submission.id,
      message: 'Recebemos os dados legais. A equipa Norm8 vai validar a informação antes dos próximos passos.',
    };
  } catch (error) {
    console.error('Failed to submit legal data intake', error);
    return { success: false, error: 'Não foi possível registar os dados legais neste momento. Tente novamente dentro de instantes.' };
  }
}

export async function updateBaseOfferFromForm(formData: FormData) {
  const parsed = baseOfferUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error('Dados da Oferta Base inválidos.');
  }

  const { baseOfferId, ...data } = parsed.data;
  const baseOffer = await prisma.baseOffer.update({
    where: { id: baseOfferId },
    data,
  });

  await prisma.leadActivity.create({
    data: {
      leadId: baseOffer.leadId,
      type: 'BASE_OFFER_UPDATED',
      message: 'Oferta Base atualizada manualmente no admin.',
      metadata: { baseOfferId },
    },
  });

  return baseOffer.leadId;
}

export async function validateBaseOffer(baseOfferId: string) {
  const baseOffer = await prisma.baseOffer.update({
    where: { id: baseOfferId },
    data: { status: 'VALIDATED' },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: baseOffer.leadId,
      type: 'BASE_OFFER_VALIDATED',
      message: 'Oferta Base marcada como validada pela equipa.',
      metadata: { baseOfferId },
    },
  });

  return baseOffer.leadId;
}

export async function saveDiscoveryNotesFromForm(formData: FormData) {
  const parsed = discoveryNotesSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error('Notas de discovery inválidas.');
  }

  const { baseOfferId, ...discoveryNotes } = parsed.data;
  const current = await prisma.baseOffer.findUnique({ where: { id: baseOfferId } });
  if (!current) {
    throw new Error('Oferta Base não encontrada.');
  }

  const metadata = mergeMetadata(current.metadata, {
    discoveryNotes,
    discoveryNotesUpdatedAt: new Date().toISOString(),
  });

  await prisma.baseOffer.update({
    where: { id: baseOfferId },
    data: { metadata },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: current.leadId,
      type: 'DISCOVERY_PREP_UPDATED',
      message: 'Preparação da discovery atualizada na Oferta Base.',
      metadata: { baseOfferId },
    },
  });

  return current.leadId;
}

export async function generateFinalProposalFromBaseOffer(baseOfferId: string) {
  const baseOffer = await prisma.baseOffer.findUnique({
    where: { id: baseOfferId },
    include: { lead: true, submission: true },
  });

  if (!baseOffer) {
    throw new Error('Oferta Base não encontrada.');
  }

  const proposal = await createProposal({
    leadId: baseOffer.leadId,
    submissionId: baseOffer.submissionId,
    title: `Proposta final Norm8 para ${baseOffer.lead.company}`,
    companyName: baseOffer.lead.company,
    contactName: baseOffer.lead.name,
    estimatedValue: extractPriceNumber(baseOffer.initialPriceRange),
    scope: baseOffer.estimatedScope,
    painPoints: baseOffer.problemSummary,
    recommendedSolution: baseOffer.suggestedSolution,
    implementationPlan: baseOffer.processToAutomate,
    nextSteps: baseOffer.nextSteps,
  });

  await prisma.baseOffer.update({
    where: { id: baseOffer.id },
    data: { status: 'CONVERTED_TO_PROPOSAL' },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: baseOffer.leadId,
      type: 'FINAL_PROPOSAL_DRAFT_CREATED',
      message: 'Proposta final criada em estado DRAFT a partir da Oferta Base.',
      metadata: { baseOfferId, proposalId: proposal.id },
    },
  });

  return { leadId: baseOffer.leadId, proposalId: proposal.id };
}

function buildPreMeetingPayload(input: PreMeetingIntakeInput): Prisma.InputJsonObject {
  return {
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    companyName: input.companyName,
    websiteOrSocials: input.websiteOrSocials ?? null,
    businessArea: input.businessArea,
    mainProblem: input.mainProblem,
    processToAutomate: input.processToAutomate,
    currentTools: input.currentTools,
    solutionObjective: input.solutionObjective,
    notes: input.notes ?? null,
    consent: true,
    payloadHash: hashPayload(input),
    submittedAt: new Date().toISOString(),
  };
}

function buildLegalPayload(input: LegalDataIntakeInput): Prisma.InputJsonObject {
  return {
    tokenProvided: Boolean(input.token),
    companyLegalName: input.companyLegalName,
    nif: input.nif,
    fiscalAddress: input.fiscalAddress,
    postalCode: input.postalCode,
    city: input.city,
    country: input.country,
    legalRepresentativeName: input.legalRepresentativeName,
    legalRepresentativeTitle: input.legalRepresentativeTitle,
    legalRepresentativeEmail: input.legalRepresentativeEmail,
    billingEmail: input.billingEmail,
    billingPhone: input.billingPhone ?? null,
    legalNotes: input.legalNotes ?? null,
    preferredSecondMeetingTime: input.preferredSecondMeetingTime ?? null,
    mainToolsNeeded: input.mainToolsNeeded ?? null,
    technicalContact: input.technicalContact ?? null,
    interestConfirmation: true,
    consent: true,
    payloadHash: hashPayload(input),
    submittedAt: new Date().toISOString(),
  };
}

function buildBaseOfferDraft(input: PreMeetingIntakeInput) {
  const modules = inferRecommendedModules(input);
  const questions = [
    `Qual é o volume mensal do processo "${input.processToAutomate}"?`,
    'Quem valida exceções e decisões sensíveis neste processo?',
    'Que integrações são obrigatórias com as ferramentas atuais?',
    'Que resultado deve estar visível na segunda reunião para ser considerado útil?',
  ];
  const risks = [
    'Confirmar qualidade e disponibilidade dos dados atuais.',
    'Validar permissões de acesso às ferramentas mencionadas.',
    'Confirmar decisores, urgência e orçamento antes de fechar âmbito.',
  ];

  return {
    status: 'INTERNAL_DRAFT' as const,
    problemSummary: input.mainProblem,
    processToAutomate: input.processToAutomate,
    suggestedSolution: `Preparar uma automação Norm8 focada em ${input.solutionObjective}, começando pelo processo: ${input.processToAutomate}.`,
    recommendedModules: modules,
    automationOpportunities: [
      `Reduzir trabalho manual em ${input.processToAutomate}.`,
      `Criar visibilidade operacional sobre ${input.mainProblem}.`,
      'Definir alertas e tarefas internas para evitar perda de contexto.',
    ],
    toolsMentioned: input.currentTools,
    estimatedScope: 'Diagnóstico, desenho do fluxo, protótipo operacional e validação com equipa interna.',
    initialPriceRange: 'A validar após discovery',
    pricingRationale: 'O preço depende do volume, integrações necessárias, qualidade dos dados e criticidade do processo.',
    questionsForDiscovery: questions,
    risksOrMissingInfo: risks,
    nextSteps: 'Usar esta Oferta Base para preparar a reunião de discovery e validar âmbito antes de criar proposta final.',
    metadata: {
      source: 'manual/pre-meeting intake',
      businessArea: input.businessArea,
      solutionObjective: input.solutionObjective,
      notes: input.notes ?? null,
      discoveryNotes: {},
    },
  };
}

function inferRecommendedModules(input: PreMeetingIntakeInput): string[] {
  const text = `${input.mainProblem} ${input.processToAutomate} ${input.currentTools} ${input.solutionObjective}`.toLowerCase();
  const modules = new Set<string>(['Discovery operacional', 'Automação de workflow']);

  if (/email|gmail|outlook|mensagem|follow/.test(text)) modules.add('Automação de comunicação');
  if (/excel|sheet|spreadsheet|relat/.test(text)) modules.add('Relatórios e dados');
  if (/crm|lead|cliente|venda/.test(text)) modules.add('CRM e pipeline comercial');
  if (/fatura|pagamento|finance|contab/.test(text)) modules.add('Operações financeiras');
  if (/alert|prazo|tarefa|aprova/.test(text)) modules.add('Alertas e aprovações');

  return Array.from(modules);
}

function buildLegalChecklistDescription(input: LegalDataIntakeInput): string {
  return [
    `Validar NIF: ${input.nif}`,
    `Confirmar representante legal: ${input.legalRepresentativeName} (${input.legalRepresentativeTitle})`,
    `Email de faturação: ${input.billingEmail}`,
    input.preferredSecondMeetingTime ? `Preferência para segunda reunião: ${input.preferredSecondMeetingTime}` : null,
    input.mainToolsNeeded ? `Ferramentas principais: ${input.mainToolsNeeded}` : null,
  ].filter(Boolean).join('\n');
}

function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function buildLeadMatch(email: string, company: string, website?: string) {
  return {
    normalizedEmail: normalizeEmail(email),
    normalizedCompany: normalizeCompany(company),
    normalizedWebsite: normalizeWebsite(website),
  };
}

async function findMatchingLead(tx: Prisma.TransactionClient, match: ReturnType<typeof buildLeadMatch>) {
  return tx.lead.findFirst({
    where: {
      OR: [
        { normalizedEmail: match.normalizedEmail },
        ...(match.normalizedWebsite ? [{ normalizedWebsite: match.normalizedWebsite }] : []),
        { normalizedCompany: match.normalizedCompany },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
}

async function findLeadForLegalData(tx: Prisma.TransactionClient, input: LegalDataIntakeInput) {
  const token = input.token?.trim();
  if (token) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const byToken = await tx.baseOffer.findFirst({
      where: { metadata: { path: ['legalDataTokenHash'], equals: tokenHash } },
      include: { lead: true },
      orderBy: { createdAt: 'desc' },
    });
    if (byToken?.lead) return byToken.lead;
  }

  return tx.lead.findFirst({
    where: {
      OR: [
        { normalizedEmail: normalizeEmail(input.legalRepresentativeEmail) },
        { normalizedEmail: normalizeEmail(input.billingEmail) },
        { normalizedCompany: normalizeCompany(input.companyLegalName) },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
}

function mergeMetadata(current: Prisma.JsonValue | null, patch: Prisma.InputJsonObject): Prisma.InputJsonObject {
  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  return { ...(base as Prisma.JsonObject), ...patch };
}

function hashPayload(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCompany(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeWebsite(value?: string): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

function extractPriceNumber(value?: string | null): number | null {
  if (!value) return null;
  const match = value.replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

async function getPendingPreMeetingInviteForSubmission(email: string, companyName: string) {
  return prisma.manualIntakeInvite.findFirst({
    where: {
      status: { in: ['DRAFT', 'SENT'] },
      OR: [
        { email: normalizeEmail(email) },
        { companyName: { equals: companyName, mode: 'insensitive' } },
      ],
    },
    include: { lead: true },
    orderBy: { createdAt: 'desc' },
  });
}
async function getUsablePreMeetingInvite(token?: string) {
  const normalizedToken = token?.trim();
  if (!normalizedToken) {
    return null;
  }

  const invite = await prisma.manualIntakeInvite.findUnique({
    where: { tokenHash: hashToken(normalizedToken) },
    include: { lead: true },
  });

  if (!invite || invite.status === 'CANCELLED' || invite.status === 'SUBMITTED') {
    return null;
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    await prisma.manualIntakeInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    return null;
  }

  return invite;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}


function isPreMeetingInvitePhoneValid(value: string): boolean {
  const normalized = value.trim();

  if (!normalized) {
    return true;
  }

  const countries = [
    { dialCode: '351', nationalDigits: 9 },
    { dialCode: '34', nationalDigits: 9 },
    { dialCode: '33', nationalDigits: 9 },
    { dialCode: '44', nationalDigits: 10 },
    { dialCode: '55', nationalDigits: 11 },
    { dialCode: '1', nationalDigits: 10 },
    { dialCode: '244', nationalDigits: 9 },
    { dialCode: '258', nationalDigits: 9 },
    { dialCode: '238', nationalDigits: 7 },
    { dialCode: '245', nationalDigits: 7 },
    { dialCode: '239', nationalDigits: 7 },
  ];

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return false;
  }

  const digits = normalized.replace(/\D/g, '');
  const country = countries
    .sort((first, second) => second.dialCode.length - first.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode));

  if (!country) {
    return false;
  }

  return digits.slice(country.dialCode.length).length === country.nationalDigits;
}
function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

function normalizeInviteSource(value: string): string {
  const source = value.trim().toLowerCase();
  if (source.includes('cold')) return 'COLD_CALL';
  if (source.includes('boca')) return 'WORD_OF_MOUTH';
  if (source.includes('refer')) return 'REFERRAL';
  return 'MANUAL_PRE_MEETING_REQUEST';
}

function getPreMeetingFormUrl(token?: string): string {
  const url = new URL('/clientes/pre-reuniao', getAppUrl());
  const normalizedToken = token?.trim();
  if (normalizedToken) {
    url.searchParams.set('token', normalizedToken);
  }
  return url.toString();
}

function getAppUrl(): string {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    'http://localhost:3000';
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  return withProtocol.replace(/\/$/, '');
}
