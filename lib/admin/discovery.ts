/**
 * ------------------------------------------------------------------
 * File: lib/admin/discovery.ts
 * Description: Structured Discovery workspace persistence for Admin leads.
 * Responsibilities:
 * - Create or load DiscoverySession records for a Lead/BaseOffer.
 * - Convert legacy BaseOffer discovery questions into DiscoveryQuestion rows.
 * - Persist Discovery notes and question answers with LeadActivity audit events.
 * ------------------------------------------------------------------
 */

import 'server-only';

import type { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  discoveryQuestionCategories,
  isDiscoveryQuestionCategory,
  type DiscoveryQuestionCategory,
  type DiscoveryQuestionInput,
  type DiscoverySessionInput,
} from './discovery-types';

const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 4000;

export type DiscoveryWorkspaceSession = DiscoverySessionInput & {
  leadId: string;
  baseOfferId: string | null;
  questions: DiscoveryQuestionInput[];
};

export type DiscoverySaveResult =
  | { success: true; leadId: string; message: string }
  | { success: false; error: string };

export async function startDiscoveryPreparationFromBaseOffer(baseOfferId: string): Promise<{ leadId: string }> {
  const normalizedBaseOfferId = cleanString(baseOfferId, MAX_SHORT_TEXT_LENGTH);

  if (!normalizedBaseOfferId) {
    throw new Error('Oferta Base não encontrada.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const baseOffer = await tx.baseOffer.findUnique({
      where: { id: normalizedBaseOfferId },
      select: { id: true, leadId: true, status: true },
    });

    if (!baseOffer) {
      throw new Error('Oferta Base não encontrada.');
    }

    await ensureDiscoveryPreparationForBaseOffer(tx, baseOffer);
    await ensureDiscoverySessionForBaseOffer(tx, baseOffer.leadId, baseOffer.id);

    return { leadId: baseOffer.leadId };
  });

  return result;
}
export async function getOrCreateDiscoverySessionForLead(leadId: string): Promise<DiscoveryWorkspaceSession | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      baseOffers: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error('Lead não encontrada.');
  }

  const baseOffer = lead.baseOffers[0] ?? null;
  if (!baseOffer) {
    return null;
  }

  const session = await prisma.$transaction(async (tx) => {
    await ensureDiscoveryPreparationForBaseOffer(tx, baseOffer);
    return ensureDiscoverySessionForBaseOffer(tx, leadId, baseOffer.id);
  });

  return toWorkspaceSession(session);
}
async function ensureDiscoveryPreparationForBaseOffer(
  tx: Prisma.TransactionClient,
  baseOffer: { id: string; leadId: string; status: string },
): Promise<void> {
  if (baseOffer.status !== 'INTERNAL_DRAFT') {
    return;
  }

  await tx.baseOffer.update({
    where: { id: baseOffer.id },
    data: { status: 'DISCOVERY_PREPARATION' },
  });

  await tx.leadActivity.create({
    data: {
      leadId: baseOffer.leadId,
      type: 'DISCOVERY_STARTED',
      message: 'A Oferta Base passou para preparação da discovery.',
      metadata: { baseOfferId: baseOffer.id, from: 'INTERNAL_DRAFT', to: 'DISCOVERY_PREPARATION' },
    },
  });
}

async function ensureDiscoverySessionForBaseOffer(
  tx: Prisma.TransactionClient,
  leadId: string,
  baseOfferId: string,
): Promise<Prisma.DiscoverySessionGetPayload<{ include: { questions: true } }>> {
  const baseOffer = await tx.baseOffer.findUnique({ where: { id: baseOfferId } });

  if (!baseOffer || baseOffer.leadId !== leadId) {
    throw new Error('Oferta Base não encontrada para esta Lead.');
  }

  const existing = await tx.discoverySession.findFirst({
    where: {
      leadId,
      baseOfferId,
      status: { not: 'ARCHIVED' },
    },
    orderBy: { updatedAt: 'desc' },
    include: { questions: { orderBy: { createdAt: 'asc' } } },
  });

  if (existing) {
    if (existing.questions.length > 0) {
      return existing;
    }

    const seedQuestions = buildDiscoveryQuestionsFromBaseOffer(baseOffer);
    if (seedQuestions.length > 0) {
      await tx.discoveryQuestion.createMany({
        data: seedQuestions.map((question) => ({
          discoverySessionId: existing.id,
          question: question.question,
          category: question.category,
          answer: question.answer || null,
          impactOrObservation: question.impactOrObservation || null,
          isAnswered: question.answer.trim().length > 0,
        })),
      });
    }

    const reloaded = await tx.discoverySession.findUnique({
      where: { id: existing.id },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    });

    if (!reloaded) {
      throw new Error('Discovery não encontrada após criação das perguntas.');
    }

    return reloaded;
  }

  const seedQuestions = buildDiscoveryQuestionsFromBaseOffer(baseOffer);
  const sessionDefaults = buildDiscoverySessionDefaults(baseOffer);

  return tx.discoverySession.create({
    data: {
      leadId,
      baseOfferId,
      status: 'IN_PROGRESS',
      ...sessionDefaults,
      questions: seedQuestions.length > 0
        ? {
            create: seedQuestions.map((question) => ({
              question: question.question,
              category: question.category,
              answer: question.answer || null,
              impactOrObservation: question.impactOrObservation || null,
              isAnswered: question.answer.trim().length > 0,
            })),
          }
        : undefined,
    },
    include: { questions: { orderBy: { createdAt: 'asc' } } },
  });
}
export async function saveDiscoverySessionFromForm(formData: FormData): Promise<DiscoverySaveResult> {
  const discoverySessionId = cleanString(formData.get('discoverySessionId'), MAX_SHORT_TEXT_LENGTH);

  if (!discoverySessionId) {
    return { success: false, error: 'Discovery não encontrada.' };
  }

  const current = await prisma.discoverySession.findUnique({
    where: { id: discoverySessionId },
    select: { id: true, leadId: true, baseOfferId: true },
  });

  if (!current) {
    return { success: false, error: 'Discovery não encontrada.' };
  }

  const meetingDate = parseOptionalDate(cleanString(formData.get('meetingDate'), MAX_SHORT_TEXT_LENGTH));
  const data = {
    meetingDate,
    summary: nullableText(formData.get('summary'), MAX_LONG_TEXT_LENGTH),
    decisionMakers: nullableText(formData.get('decisionMakers'), MAX_LONG_TEXT_LENGTH),
    urgency: nullableText(formData.get('urgency'), MAX_LONG_TEXT_LENGTH),
    budgetRange: nullableText(formData.get('budgetRange'), MAX_LONG_TEXT_LENGTH),
    technicalComplexity: nullableText(formData.get('technicalComplexity'), MAX_LONG_TEXT_LENGTH),
    confirmedScope: nullableText(formData.get('confirmedScope'), MAX_LONG_TEXT_LENGTH),
    nextSteps: nullableText(formData.get('nextSteps'), MAX_LONG_TEXT_LENGTH),
  };

  await prisma.$transaction([
    prisma.discoverySession.update({
      where: { id: discoverySessionId },
      data,
    }),
    prisma.leadActivity.create({
      data: {
        leadId: current.leadId,
        type: 'DISCOVERY_UPDATED',
        message: 'Discovery atualizada: notas da reunião guardadas no Admin.',
        metadata: { discoverySessionId, baseOfferId: current.baseOfferId },
      },
    }),
  ]);

  return { success: true, leadId: current.leadId, message: 'Discovery guardada com sucesso.' };
}

export async function saveDiscoveryQuestionsFromForm(formData: FormData): Promise<DiscoverySaveResult> {
  const discoverySessionId = cleanString(formData.get('discoverySessionId'), MAX_SHORT_TEXT_LENGTH);
  const questionCount = Number(formData.get('questionCount') ?? 0);

  if (!discoverySessionId || !Number.isInteger(questionCount) || questionCount < 0 || questionCount > 100) {
    return { success: false, error: 'Dados da Discovery inválidos.' };
  }

  const current = await prisma.discoverySession.findUnique({
    where: { id: discoverySessionId },
    include: { questions: { select: { id: true } } },
  });

  if (!current) {
    return { success: false, error: 'Discovery não encontrada.' };
  }

  const allowedQuestionIds = new Set(current.questions.map((question) => question.id));
  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (let index = 0; index < questionCount; index += 1) {
    const questionId = cleanString(formData.get(`questionId-${index}`), MAX_SHORT_TEXT_LENGTH);

    if (!questionId || !allowedQuestionIds.has(questionId)) {
      continue;
    }

    const answer = cleanString(formData.get(`answer-${index}`), MAX_LONG_TEXT_LENGTH);
    const rawCategory = cleanString(formData.get(`category-${index}`), MAX_SHORT_TEXT_LENGTH);
    const impactOrObservation = cleanString(formData.get(`impactOrObservation-${index}`), MAX_LONG_TEXT_LENGTH);
    const category = isDiscoveryQuestionCategory(rawCategory) ? rawCategory : 'PROCESS';

    updates.push(prisma.discoveryQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer || null,
        category,
        impactOrObservation: impactOrObservation || null,
        isAnswered: answer.trim().length > 0,
      },
    }));
  }

  await prisma.$transaction([
    ...updates,
    prisma.leadActivity.create({
      data: {
        leadId: current.leadId,
        type: 'DISCOVERY_UPDATED',
        message: 'Discovery atualizada: perguntas, respostas e notas da discovery guardadas no Admin.',
        metadata: {
          discoverySessionId,
          baseOfferId: current.baseOfferId,
          questionCount: updates.length,
        },
      },
    }),
  ]);

  return { success: true, leadId: current.leadId, message: 'Discovery guardada com sucesso.' };
}


export async function saveDiscoveryWorkspaceFromForm(formData: FormData): Promise<DiscoverySaveResult> {
  const leadId = cleanString(formData.get('leadId'), MAX_SHORT_TEXT_LENGTH);
  const discoverySessionId = cleanString(formData.get('discoverySessionId'), MAX_SHORT_TEXT_LENGTH);
  const baseOfferId = cleanString(formData.get('baseOfferId'), MAX_SHORT_TEXT_LENGTH);
  const questionCount = Number(formData.get('questionCount') ?? 0);

  if (!leadId || !discoverySessionId || !Number.isInteger(questionCount) || questionCount < 0 || questionCount > 100) {
    return { success: false, error: 'Dados da Discovery inválidos.' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.discoverySession.findUnique({
      where: { id: discoverySessionId },
      include: { questions: { select: { id: true } } },
    });

    if (!session || session.leadId !== leadId) {
      throw new Error('Discovery não encontrada para esta Lead.');
    }

    const allowedQuestionIds = new Set(session.questions.map((question) => question.id));
    const submittedQuestions: Array<{
      id: string;
      answer: string | null;
      category: DiscoveryQuestionCategory;
      impactOrObservation: string | null;
      isAnswered: boolean;
    }> = [];

    for (let index = 0; index < questionCount; index += 1) {
      const questionId = cleanString(formData.get(`questionId-${index}`), MAX_SHORT_TEXT_LENGTH);

      if (!questionId) {
        continue;
      }

      if (!allowedQuestionIds.has(questionId)) {
        throw new Error('Uma das perguntas não pertence a esta Discovery.');
      }

      const answer = cleanString(formData.get(`answer-${index}`), MAX_LONG_TEXT_LENGTH);
      const rawCategory = cleanString(formData.get(`category-${index}`), MAX_SHORT_TEXT_LENGTH);
      const impactOrObservation = cleanString(formData.get(`impactOrObservation-${index}`), MAX_LONG_TEXT_LENGTH);
      const category = isDiscoveryQuestionCategory(rawCategory) ? rawCategory : 'PROCESS';

      submittedQuestions.push({
        id: questionId,
        answer: answer || null,
        category,
        impactOrObservation: impactOrObservation || null,
        isAnswered: answer.trim().length > 0,
      });
    }

    await tx.discoverySession.update({
      where: { id: discoverySessionId },
      data: {
        meetingDate: parseOptionalDate(cleanString(formData.get('meetingDate'), MAX_SHORT_TEXT_LENGTH)),
        summary: nullableText(formData.get('summary'), MAX_LONG_TEXT_LENGTH),
        decisionMakers: nullableText(formData.get('decisionMakers'), MAX_LONG_TEXT_LENGTH),
        urgency: nullableText(formData.get('urgency'), MAX_LONG_TEXT_LENGTH),
        budgetRange: nullableText(formData.get('budgetRange'), MAX_LONG_TEXT_LENGTH),
        technicalComplexity: nullableText(formData.get('technicalComplexity'), MAX_LONG_TEXT_LENGTH),
        confirmedScope: nullableText(formData.get('confirmedScope'), MAX_LONG_TEXT_LENGTH),
        nextSteps: nullableText(formData.get('sessionNextSteps'), MAX_LONG_TEXT_LENGTH),
      },
    });

    for (const question of submittedQuestions) {
      await tx.discoveryQuestion.update({
        where: { id: question.id },
        data: {
          answer: question.answer,
          category: question.category,
          impactOrObservation: question.impactOrObservation,
          isAnswered: question.isAnswered,
        },
      });
    }

    if (baseOfferId) {
      const baseOffer = await tx.baseOffer.findUnique({
        where: { id: baseOfferId },
        select: { id: true, leadId: true },
      });

      if (!baseOffer || baseOffer.leadId !== leadId || session.baseOfferId !== baseOffer.id) {
        throw new Error('Oferta Base não encontrada para esta Discovery.');
      }

      await tx.baseOffer.update({
        where: { id: baseOfferId },
        data: {
          problemSummary: nullableText(formData.get('baseOfferProblemSummary'), MAX_LONG_TEXT_LENGTH),
          processToAutomate: nullableText(formData.get('baseOfferProcessToAutomate'), MAX_LONG_TEXT_LENGTH),
          suggestedSolution: nullableText(formData.get('baseOfferSuggestedSolution'), MAX_LONG_TEXT_LENGTH),
          toolsMentioned: nullableText(formData.get('baseOfferToolsMentioned'), MAX_LONG_TEXT_LENGTH),
          estimatedScope: nullableText(formData.get('baseOfferEstimatedScope'), MAX_LONG_TEXT_LENGTH),
          initialPriceRange: nullableText(formData.get('baseOfferInitialPriceRange'), MAX_SHORT_TEXT_LENGTH),
          pricingRationale: nullableText(formData.get('baseOfferPricingRationale'), MAX_LONG_TEXT_LENGTH),
          nextSteps: nullableText(formData.get('baseOfferNextSteps'), MAX_LONG_TEXT_LENGTH),
        },
      });
    }

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'DISCOVERY_UPDATED',
        message: 'Notas e respostas da discovery guardadas no Admin.',
        metadata: {
          discoverySessionId,
          baseOfferId: baseOfferId || session.baseOfferId,
          questionCount: submittedQuestions.length,
        },
      },
    });

    return { leadId };
  });

  return {
    success: true,
    leadId: result.leadId,
    message: 'Notas da Discovery guardadas com sucesso.',
  };
}


export async function completeDiscoveryFromForm(formData: FormData): Promise<DiscoverySaveResult> {
  const leadId = cleanString(formData.get('leadId'), MAX_SHORT_TEXT_LENGTH);
  const discoverySessionId = cleanString(formData.get('discoverySessionId'), MAX_SHORT_TEXT_LENGTH);
  const baseOfferId = cleanString(formData.get('baseOfferId'), MAX_SHORT_TEXT_LENGTH);

  if (!leadId || !discoverySessionId) {
    return { success: false, error: 'Discovery não encontrada.' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.discoverySession.findUnique({
      where: { id: discoverySessionId },
      select: { id: true, leadId: true, baseOfferId: true, status: true },
    });

    if (!session || session.leadId !== leadId) {
      throw new Error('Discovery não encontrada para esta Lead.');
    }

    const effectiveBaseOfferId = baseOfferId || session.baseOfferId;
    const baseOffer = effectiveBaseOfferId
      ? await tx.baseOffer.findUnique({
          where: { id: effectiveBaseOfferId },
          select: { id: true, leadId: true, status: true },
        })
      : null;

    if (effectiveBaseOfferId && (!baseOffer || baseOffer.leadId !== leadId)) {
      throw new Error('Oferta Base não encontrada para esta Discovery.');
    }

    const alreadyCompleted = session.status === 'COMPLETED';

    if (!alreadyCompleted) {
      await tx.discoverySession.update({
        where: { id: discoverySessionId },
        data: { status: 'COMPLETED' },
      });
    }

    if (baseOffer && baseOffer.status !== 'CONVERTED_TO_PROPOSAL' && baseOffer.status !== 'ARCHIVED') {
      await tx.baseOffer.update({
        where: { id: baseOffer.id },
        data: { status: 'DISCOVERY_COMPLETED' },
      });
    }

    if (!alreadyCompleted) {
      await tx.leadActivity.create({
        data: {
          leadId,
          type: 'DISCOVERY_COMPLETED',
          message: 'As informações principais da reunião foram validadas e a Lead está pronta para proposta.',
          metadata: {
            discoverySessionId,
            baseOfferId: baseOffer?.id ?? null,
            previousDiscoveryStatus: session.status,
            baseOfferStatus: baseOffer?.status ?? null,
          },
        },
      });
    }

    return { leadId };
  });

  return {
    success: true,
    leadId: result.leadId,
    message: 'Discovery marcada como concluída.',
  };
}

function toWorkspaceSession(session: Prisma.DiscoverySessionGetPayload<{ include: { questions: true } }>): DiscoveryWorkspaceSession {
  return {
    id: session.id,
    leadId: session.leadId,
    baseOfferId: session.baseOfferId,
    status: session.status,
    meetingDate: session.meetingDate,
    summary: session.summary,
    decisionMakers: session.decisionMakers,
    urgency: session.urgency,
    budgetRange: session.budgetRange,
    technicalComplexity: session.technicalComplexity,
    confirmedScope: session.confirmedScope,
    nextSteps: session.nextSteps,
    questions: session.questions.map((question) => ({
      id: question.id,
      question: question.question,
      category: question.category,
      answer: question.answer ?? '',
      status: question.isAnswered ? 'ANSWERED' : 'UNANSWERED',
      impactOrObservation: question.impactOrObservation ?? '',
    })),
  };
}

function buildDiscoverySessionDefaults(baseOffer: BaseOfferSeedSource): Partial<DiscoverySessionInput> {
  const notes = toRecord(toRecord(baseOffer.metadata).discoveryNotes);

  return {
    summary: firstText(notes.confirmedProblems, notes.impact, baseOffer.problemSummary),
    decisionMakers: firstText(notes.decisionMakers),
    urgency: firstText(notes.urgency),
    budgetRange: firstText(notes.budget, baseOffer.initialPriceRange),
    technicalComplexity: firstText(notes.tools, notes.discardedFeatures, baseOffer.toolsMentioned),
    confirmedScope: firstText(notes.validatedSolution, baseOffer.estimatedScope),
    nextSteps: firstText(notes.nextSteps, baseOffer.nextSteps),
    meetingDate: parseOptionalDate(firstText(notes.expectedSecondMeetingDate)),
  };
}

function buildDiscoveryQuestionsFromBaseOffer(baseOffer: BaseOfferSeedSource): Array<{
  question: string;
  category: DiscoveryQuestionCategory;
  answer: string;
  impactOrObservation: string;
}> {
  const generatedQuestions = parseLegacyDiscoveryQuestions(baseOffer.questionsForDiscovery);
  const savedQuestions = getSavedDiscoveryQuestions(baseOffer.metadata);
  const savedByQuestion = new Map(savedQuestions.map((question) => [normalizeQuestionKey(question.question), question]));
  const generatedKeys = new Set(generatedQuestions.map(normalizeQuestionKey));

  return [
    ...generatedQuestions.map((question) => {
      const saved = savedByQuestion.get(normalizeQuestionKey(question));

      return {
        question,
        category: saved?.category ?? inferDiscoveryQuestionCategory(question),
        answer: saved?.answer ?? '',
        impactOrObservation: saved?.impactOrObservation ?? '',
      };
    }),
    ...savedQuestions
      .filter((question) => !generatedKeys.has(normalizeQuestionKey(question.question)))
      .map((question) => ({
        question: question.question,
        category: question.category,
        answer: question.answer,
        impactOrObservation: question.impactOrObservation ?? '',
      })),
  ];
}

type BaseOfferSeedSource = {
  id: string;
  problemSummary: string | null;
  toolsMentioned: string | null;
  estimatedScope: string | null;
  initialPriceRange: string | null;
  nextSteps: string | null;
  questionsForDiscovery: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
};

function getSavedDiscoveryQuestions(metadata: unknown): DiscoveryQuestionInput[] {
  const record = toRecord(metadata);
  const value = record.discoveryQuestions;

  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const itemRecord = toRecord(item);
    const question = cleanString(itemRecord.question, MAX_LONG_TEXT_LENGTH);

    if (!question) return [];

    const answer = cleanString(itemRecord.answer, MAX_LONG_TEXT_LENGTH);
    const categoryValue = cleanString(itemRecord.category, MAX_SHORT_TEXT_LENGTH);

    return [{
      id: cleanString(itemRecord.id, MAX_SHORT_TEXT_LENGTH) || question,
      question,
      category: isDiscoveryQuestionCategory(categoryValue) ? categoryValue : 'PROCESS',
      answer,
      status: answer ? 'ANSWERED' as const : 'UNANSWERED' as const,
      impactOrObservation: cleanString(itemRecord.impactOrObservation, MAX_LONG_TEXT_LENGTH),
    }];
  });
}

function parseLegacyDiscoveryQuestions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeQuestions(value.flatMap((item) => parseLegacyDiscoveryQuestions(item)));
  }

  const text = cleanString(value, MAX_LONG_TEXT_LENGTH);
  if (!text) return [];

  return dedupeQuestions(
    text
      .replace(/\r/g, '\n')
      .split(/\n|[•*-]\s+/)
      .flatMap((part) => splitQuestionText(part))
      .map(normalizeQuestionText)
      .filter(Boolean),
  );
}

function splitQuestionText(value: string): string[] {
  const text = value.trim();
  if (!text) return [];

  const matches = text.match(/[^?]+\?/g);
  if (matches) return matches.map((match) => match.trim()).filter(Boolean);

  return [text];
}

function normalizeQuestionText(value: string): string {
  const text = value
    .trim()
    .replace(/^[-•*\d.)\s]+/, '')
    .replace(/\s+/g, ' ');

  if (!text) return '';
  if (text.endsWith('?')) return text;

  return /^(qual|quais|quem|que|como|onde|quando|quanto|quantas|quantos|existe|há|ha)\b/i.test(text)
    ? `${text}?`
    : text;
}

function dedupeQuestions(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const question = value.trim();
    const key = normalizeQuestionKey(question);

    if (question && !seen.has(key)) {
      seen.add(key);
      result.push(question);
    }
  });

  return result;
}

function inferDiscoveryQuestionCategory(question: string): DiscoveryQuestionCategory {
  const text = question.toLowerCase();

  if (/ferrament|crm|gmail|whatsapp|software|excel|sheet|notion|outlook/.test(text)) return 'TOOLS';
  if (/decisor|aprova|validar|valida|responsável|responsavel|quem/.test(text)) return 'DECISION';
  if (/urgência|urgencia|prazo|quando|prioridade/.test(text)) return 'URGENCY';
  if (/orçamento|orcamento|preço|preco|investimento|budget/.test(text)) return 'BUDGET';
  if (/integra|api|conectar|sincronizar|ligar/.test(text)) return 'INTEGRATIONS';
  if (/impacto|resultado|ganho|perda|útil|util/.test(text)) return 'IMPACT';
  if (/risco|bloqueio|dependência|dependencia|exceção|excecao/.test(text)) return 'RISKS';
  if (/próximo passo|proximo passo|avançar|avancar|reunião|reuniao|proposta/.test(text)) return 'NEXT_STEPS';
  if (/volume|processo|etapa|fluxo/.test(text)) return 'PROCESS';

  return 'PROCESS';
}

function normalizeQuestionKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = cleanString(value, MAX_LONG_TEXT_LENGTH);
    if (text) return text;
  }

  return undefined;
}

function nullableText(value: unknown, maxLength: number): string | null {
  return cleanString(value, maxLength) || null;
}

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseOptionalDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function formatDiscoverySessionStatus(status: DiscoveryWorkspaceSession['status'] | string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em preparação',
    COMPLETED: 'Concluída',
    ARCHIVED: 'Arquivada',
  };

  return labels[status] ?? 'Estado desconhecido';
}