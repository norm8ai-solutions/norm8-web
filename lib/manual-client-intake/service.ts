import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@/app/generated/prisma/client';
import { syncFinanceIncomeForProposal } from '@/lib/admin/finance-commercial-sync';
import { prisma } from '@/lib/db/prisma';
import { getActiveFinalProposalForLead } from '@/lib/proposals/service';
import { sendManualIntakeEmails, sendPreMeetingInviteEmail } from './email';

const requiredText = (label: string) => z.string().trim().min(1, `${label} é obrigatório.`);
const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const emailSchema = z.string().trim().email('Insira um email válido.').toLowerCase();
const invalidPhoneMessage = 'Insira um número de telefone válido.';
const pastMeetingAtMessage = 'A data/hora combinada não pode estar no passado.';
const websiteOrSocialSchema = z.string().trim().optional().transform((value) => value || undefined);
const consentSchema = z.literal('on', { message: 'O consentimento é obrigatório.' });
const honeypotSchema = z.string().trim().max(0, 'Pedido inválido.').optional().or(z.literal(''));

const discoveryQuestionCategories = [
  'PROCESS',
  'TOOLS',
  'DECISION',
  'URGENCY',
  'BUDGET',
  'INTEGRATIONS',
  'IMPACT',
  'RISKS',
  'NEXT_STEPS',
] as const;
export const preMeetingIntakeSchema = z.object({
  contactName: requiredText('Nome do contacto'),
  email: emailSchema,
  phone: requiredText('Telefone'),
  companyName: requiredText('Nome da empresa'),
  websiteOrSocials: websiteOrSocialSchema,
  businessArea: requiredText('Setor de atividade'),
  mainProblem: requiredText('Principal problema'),
  processToAutomate: requiredText('Processo a automatizar'),
  currentTools: requiredText('Ferramentas atuais'),
  solutionObjective: requiredText('Objetivo da solução'),
  notes: optionalText,
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

export type DiscoveryQuestionsResult =
  | { success: true; leadId: string; message: string }
  | { success: false; error: string };

type DiscoveryQuestionCategory = (typeof discoveryQuestionCategories)[number];

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
            message: 'Foi criada uma Oferta Base interna para preparar a discovery e a proposta final.',
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
      message: 'Oferta Base atualizada manualmente no Admin.',
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
      type: 'DISCOVERY_UPDATED',
      message: 'Notas, respostas e dados comerciais da discovery foram guardados no Admin.',
      metadata: { baseOfferId },
    },
  });

  return current.leadId;
}

export async function saveDiscoveryQuestionsFromForm(formData: FormData): Promise<DiscoveryQuestionsResult> {
  const baseOfferId = String(formData.get('baseOfferId') ?? '').trim();
  const questionCount = Number(formData.get('questionCount') ?? 0);

  if (!baseOfferId || !Number.isInteger(questionCount) || questionCount < 0) {
    return { success: false, error: 'Dados das perguntas de discovery inválidos.' };
  }

  const current = await prisma.baseOffer.findUnique({ where: { id: baseOfferId } });
  if (!current) {
    return { success: false, error: 'Oferta Base não encontrada.' };
  }

  const savedAt = new Date().toISOString();
  const discoveryQuestions: Prisma.InputJsonObject[] = [];

  for (let index = 0; index < questionCount; index += 1) {
    const question = String(formData.get(`question-${index}`) ?? '').trim();

    if (!question) {
      continue;
    }

    const answer = String(formData.get(`answer-${index}`) ?? '').trim();
    const rawCategory = String(formData.get(`category-${index}`) ?? '').trim();
    const impactOrObservation = String(formData.get(`impactOrObservation-${index}`) ?? '').trim();
    const id = String(formData.get(`questionId-${index}`) ?? '').trim() || `question-${index + 1}`;
    const category = isDiscoveryQuestionCategory(rawCategory) ? rawCategory : 'PROCESS';

    discoveryQuestions.push({
      id,
      question,
      category,
      answer,
      status: answer ? 'ANSWERED' : 'UNANSWERED',
      impactOrObservation,
      updatedAt: savedAt,
    });
  }

  const metadata = mergeMetadata(current.metadata, {
    discoveryQuestions,
    discoveryQuestionsUpdatedAt: savedAt,
  });

  await prisma.baseOffer.update({
    where: { id: baseOfferId },
    data: { metadata },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: current.leadId,
      type: 'DISCOVERY_UPDATED',
      message: 'Notas, respostas e dados comerciais da discovery foram guardados no Admin.',
      metadata: { baseOfferId, questionCount: discoveryQuestions.length },
    },
  });

  return {
    success: true,
    leadId: current.leadId,
    message: 'Respostas da Discovery guardadas com sucesso.',
  };
}
export async function generateFinalProposalFromBaseOffer(baseOfferId: string) {
  const context = await buildFinalProposalContext({ baseOfferId });
  const activeProposal = await getActiveFinalProposalForLead(context.lead.id, context.baseOfferId);

  if (activeProposal) {
    await syncBaseOfferWithFinalProposal({
      baseOfferId: context.baseOfferId,
      leadId: context.lead.id,
      proposalId: activeProposal.id,
    });

    await syncFinanceIncomeForProposal(activeProposal.id);

    return { leadId: context.lead.id, proposalId: activeProposal.id };
  }

  const proposal = await prisma.$transaction(async (tx) => {
    const createdProposal = await tx.proposal.create({
      data: {
        lead: { connect: { id: context.lead.id } },
        ...(context.submissionId ? { submission: { connect: { id: context.submissionId } } } : {}),
        title: context.title,
        companyName: context.lead.companyName,
        contactName: context.lead.contactName,
        estimatedValue: context.estimatedValue ? new Prisma.Decimal(context.estimatedValue) : undefined,
        scope: context.confirmedScope,
        painPoints: context.problemValidated,
        recommendedSolution: context.suggestedSolution,
        implementationPlan: context.implementationPlan,
        nextSteps: context.nextSteps,
      },
    });

    await syncBaseOfferWithFinalProposal(
      {
        baseOfferId: context.baseOfferId,
        leadId: context.lead.id,
        proposalId: createdProposal.id,
      },
      tx,
    );

    await tx.leadActivity.create({
      data: {
        leadId: context.lead.id,
        type: 'FINAL_PROPOSAL_GENERATED',
        message: context.discoveryCompleted
          ? 'A Proposta Final foi criada com base na Oferta Base e nos dados validados na Discovery.'
          : 'A Proposta Final foi criada antes da Discovery estar formalmente concluída.',
        metadata: {
          baseOfferId: context.baseOfferId,
          proposalDataSource: context.source,
          discoveryAnswerCount: context.discoveryAnswers.length,
          discoverySessionId: context.discoverySessionId,
          proposalId: createdProposal.id,
        },
      },
    });

    return createdProposal;
  });

  await syncFinanceIncomeForProposal(proposal.id);

  return { leadId: context.lead.id, proposalId: proposal.id };
}
type FinalProposalDiscoveryAnswer = {
  question: string;
  answer: string;
  category: DiscoveryQuestionCategory;
  impactOrObservation?: string;
};

type FinalProposalContext = {
  baseOfferId: string;
  discoverySessionId?: string;
  discoveryCompleted: boolean;
  discoveryAnswers: FinalProposalDiscoveryAnswer[];
  estimatedValue?: number | null;
  lead: {
    id: string;
    companyName: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  priceRange?: string | null;
  pricingRationale?: string | null;
  problemValidated: string;
  recommendedModules: string;
  confirmedScope: string;
  source: 'DISCOVERY' | 'BASE_OFFER' | 'PRE_MEETING_SUBMISSION' | 'MANUAL';
  submissionId?: string | null;
  suggestedSolution: string;
  implementationPlan: string;
  nextSteps: string;
  title: string;
  toolsConfirmed: string;
  risksIdentified: string;
};

type FinalProposalBaseOffer = Prisma.BaseOfferGetPayload<{ include: { lead: true; submission: true } }>;
type FinalProposalDiscoverySession = Prisma.DiscoverySessionGetPayload<{ include: { questions: true } }>;

export async function buildFinalProposalContext({ baseOfferId }: { baseOfferId: string }): Promise<FinalProposalContext> {
  const baseOffer = await prisma.baseOffer.findUnique({
    where: { id: baseOfferId },
    include: { lead: true, submission: true },
  });

  if (!baseOffer) {
    throw new Error('Oferta Base não encontrada.');
  }

  const discoverySession = await prisma.discoverySession.findFirst({
    where: {
      leadId: baseOffer.leadId,
      baseOfferId: baseOffer.id,
      status: { not: 'ARCHIVED' },
    },
    include: { questions: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });

  return buildFinalProposalContextFromSources(baseOffer, discoverySession);
}

function buildFinalProposalContextFromSources(
  baseOffer: FinalProposalBaseOffer,
  discoverySession: FinalProposalDiscoverySession | null,
): FinalProposalContext {
  const submissionPayload = getJsonObject(baseOffer.submission?.payload ?? null);
  const answeredQuestions = getAnsweredDiscoveryQuestions(discoverySession);
  const answersByCategory = groupDiscoveryAnswersByCategory(answeredQuestions);
  const discoveryHasContext = Boolean(
    discoverySession &&
      (nonEmpty(discoverySession.summary) ||
        nonEmpty(discoverySession.confirmedScope) ||
        nonEmpty(discoverySession.nextSteps) ||
        nonEmpty(discoverySession.budgetRange) ||
        answeredQuestions.length > 0),
  );

  const problemValidated = firstText(
    discoverySession?.summary,
    formatDiscoveryAnswers(answersByCategory.PROCESS),
    formatDiscoveryAnswers(answersByCategory.IMPACT),
    baseOffer.problemSummary,
    getPayloadText(submissionPayload, 'mainProblem'),
    'Ainda sem informação registada.',
  );

  const toolsConfirmed = firstText(
    formatDiscoveryAnswers(answersByCategory.TOOLS),
    baseOffer.toolsMentioned,
    getPayloadText(submissionPayload, 'currentTools'),
    'A validar com o cliente.',
  );

  const risksIdentified = firstText(
    formatDiscoveryAnswers(answersByCategory.RISKS),
    formatJsonText(baseOffer.risksOrMissingInfo),
    'A validar com o cliente.',
  );

  const priceRange = firstOptionalText(
    discoverySession?.budgetRange,
    formatDiscoveryAnswers(answersByCategory.BUDGET),
    baseOffer.initialPriceRange,
  );

  const confirmedScope = firstText(
    discoverySession?.confirmedScope,
    formatDiscoveryAnswers(answersByCategory.PROCESS),
    baseOffer.estimatedScope,
    getPayloadText(submissionPayload, 'processToAutomate'),
    'A validar com o cliente.',
  );

  const suggestedSolution = firstText(
    baseOffer.suggestedSolution,
    getPayloadText(submissionPayload, 'solutionObjective'),
    'Solução Norm8 a detalhar com base no contexto validado na Discovery.',
  );

  const integrations = formatDiscoveryAnswers(answersByCategory.INTEGRATIONS);
  const decision = firstOptionalText(discoverySession?.decisionMakers, formatDiscoveryAnswers(answersByCategory.DECISION));
  const urgency = firstOptionalText(discoverySession?.urgency, formatDiscoveryAnswers(answersByCategory.URGENCY));
  const impact = formatDiscoveryAnswers(answersByCategory.IMPACT);

  const implementationPlan = formatProposalSections([
    ['Escopo confirmado', confirmedScope],
    ['Ferramentas confirmadas', toolsConfirmed],
    ['Integrações necessárias', integrations],
    ['Complexidade técnica', discoverySession?.technicalComplexity],
    ['Riscos identificados', risksIdentified],
  ], firstText(baseOffer.processToAutomate, getPayloadText(submissionPayload, 'processToAutomate'), 'Plano de implementação a validar com o cliente.'));

  const nextSteps = firstText(
    discoverySession?.nextSteps,
    formatDiscoveryAnswers(answersByCategory.NEXT_STEPS),
    baseOffer.nextSteps,
    'Confirmar prioridades, validar escopo final e alinhar calendário de implementação.',
  );

  const painPoints = formatProposalSections([
    ['Problema validado', problemValidated],
    ['Impacto esperado', impact],
    ['Decisão', decision],
    ['Urgência', urgency],
  ], problemValidated);

  const recommendedSolution = formatProposalSections([
    ['Solução recomendada', suggestedSolution],
    ['Módulos recomendados', formatJsonText(baseOffer.recommendedModules)],
    ['Oportunidades de automação', formatJsonText(baseOffer.automationOpportunities)],
    ['Racional de preço', baseOffer.pricingRationale],
  ], suggestedSolution);

  return {
    baseOfferId: baseOffer.id,
    discoverySessionId: discoverySession?.id,
    discoveryCompleted: discoverySession?.status === 'COMPLETED' || baseOffer.status === 'DISCOVERY_COMPLETED' || baseOffer.status === 'VALIDATED',
    discoveryAnswers: answeredQuestions,
    estimatedValue: extractPriceNumber(priceRange),
    lead: {
      id: baseOffer.leadId,
      companyName: firstText(baseOffer.lead.company, getPayloadText(submissionPayload, 'companyName'), 'Empresa'),
      contactName: firstOptionalText(baseOffer.lead.name, getPayloadText(submissionPayload, 'contactName')),
      email: baseOffer.lead.email,
      phone: baseOffer.lead.phone,
    },
    priceRange,
    pricingRationale: firstOptionalText(baseOffer.pricingRationale),
    problemValidated: painPoints,
    recommendedModules: formatJsonText(baseOffer.recommendedModules) ?? 'Por definir',
    confirmedScope,
    source: discoveryHasContext ? 'DISCOVERY' : baseOfferHasContext(baseOffer) ? 'BASE_OFFER' : baseOffer.submission ? 'PRE_MEETING_SUBMISSION' : 'MANUAL',
    submissionId: baseOffer.submissionId,
    suggestedSolution: recommendedSolution,
    implementationPlan,
    nextSteps,
    title: `Proposta final Norm8 para ${firstText(baseOffer.lead.company, getPayloadText(submissionPayload, 'companyName'), 'Empresa')}`,
    toolsConfirmed,
    risksIdentified,
  };
}

function getAnsweredDiscoveryQuestions(discoverySession: FinalProposalDiscoverySession | null): FinalProposalDiscoveryAnswer[] {
  if (!discoverySession) {
    return [];
  }

  return discoverySession.questions
    .filter((question) => question.isAnswered || nonEmpty(question.answer))
    .map((question) => ({
      question: question.question,
      answer: question.answer?.trim() ?? '',
      category: question.category as DiscoveryQuestionCategory,
      impactOrObservation: firstOptionalText(question.impactOrObservation) ?? undefined,
    }))
    .filter((question) => nonEmpty(question.answer));
}

function groupDiscoveryAnswersByCategory(
  questions: FinalProposalDiscoveryAnswer[],
): Partial<Record<DiscoveryQuestionCategory, FinalProposalDiscoveryAnswer[]>> {
  return questions.reduce<Partial<Record<DiscoveryQuestionCategory, FinalProposalDiscoveryAnswer[]>>>((groups, question) => {
    groups[question.category] = [...(groups[question.category] ?? []), question];
    return groups;
  }, {});
}

function formatDiscoveryAnswers(questions?: FinalProposalDiscoveryAnswer[]): string | null {
  if (!questions?.length) {
    return null;
  }

  return uniqueText(
    questions.map((question) => {
      const observation = firstOptionalText(question.impactOrObservation);
      return observation ? `${question.answer} (${observation})` : question.answer;
    }),
  ).join('\n');
}

function formatProposalSections(sections: Array<[string, string | null | undefined]>, fallback: string): string {
  const lines = sections
    .map(([label, value]) => {
      const normalized = firstOptionalText(value);
      return normalized ? `${label}: ${normalized}` : null;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join('\n') : fallback;
}

function formatJsonText(value: Prisma.JsonValue | null | undefined): string | null {
  if (typeof value === 'string') {
    return firstOptionalText(value);
  }

  if (Array.isArray(value)) {
    return uniqueText(value.flatMap((item) => formatJsonListItem(item))).join('\n') || null;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${formatJsonText(item) ?? ''}`.trim())
      .filter(Boolean)
      .join('\n') || null;
  }

  return null;
}

function formatJsonListItem(value: Prisma.JsonValue): string[] {
  if (typeof value === 'string') {
    return firstOptionalText(value) ? [value.trim()] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => formatJsonListItem(item));
  }

  if (value && typeof value === 'object') {
    return [Object.values(value).flatMap((item) => (item === undefined ? [] : formatJsonListItem(item))).join(' ').trim()].filter(Boolean);
  }

  return [];
}

function getJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function getPayloadText(payload: Prisma.JsonObject | null, key: string): string | null {
  const value = payload?.[key];
  return typeof value === 'string' ? firstOptionalText(value) : null;
}

function firstText(...values: Array<string | null | undefined>): string {
  return firstOptionalText(...values) ?? 'Por definir';
}

function firstOptionalText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function nonEmpty(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function uniqueText(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = firstOptionalText(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function baseOfferHasContext(baseOffer: FinalProposalBaseOffer): boolean {
  return Boolean(
    nonEmpty(baseOffer.problemSummary) ||
      nonEmpty(baseOffer.suggestedSolution) ||
      nonEmpty(baseOffer.estimatedScope) ||
      nonEmpty(baseOffer.nextSteps) ||
      nonEmpty(baseOffer.toolsMentioned) ||
      formatJsonText(baseOffer.recommendedModules) ||
      formatJsonText(baseOffer.risksOrMissingInfo),
  );
}
async function syncBaseOfferWithFinalProposal(
  input: { baseOfferId: string; leadId: string; proposalId: string },
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const discoverySession = await tx.discoverySession.findFirst({
    where: {
      leadId: input.leadId,
      baseOfferId: input.baseOfferId,
      status: { not: 'ARCHIVED' },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, status: true },
  });

  await tx.baseOffer.update({
    where: { id: input.baseOfferId },
    data: { status: 'CONVERTED_TO_PROPOSAL' },
  });

  if (discoverySession && discoverySession.status !== 'COMPLETED') {
    await tx.discoverySession.update({
      where: { id: discoverySession.id },
      data: { status: 'COMPLETED' },
    });

    await tx.leadActivity.create({
      data: {
        leadId: input.leadId,
        type: 'DISCOVERY_COMPLETED',
        message: 'Discovery marcada como concluída automaticamente após a criação da Proposta Final.',
        metadata: {
          baseOfferId: input.baseOfferId,
          discoverySessionId: discoverySession.id,
          previousDiscoveryStatus: discoverySession.status,
          proposalId: input.proposalId,
          source: 'final-proposal-generation',
        },
      },
    });
  }
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

function isDiscoveryQuestionCategory(value: string): value is DiscoveryQuestionCategory {
  return discoveryQuestionCategories.includes(value as DiscoveryQuestionCategory);
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
