import 'server-only';

import { createGroqClient } from '@/lib/ai/groq';

const FALLBACK_INTERNAL_OBJECTIVE =
  'Alinhar contexto, prioridades e próximos passos comerciais da oportunidade.';
const FORBIDDEN_CLIENT_LANGUAGE =
  /\b(lead|pipeline|funil comercial|funil|qualificar|qualificação|qualificar oportunidade|oportunidade comercial|ação pendente|potencial comercial|fechar oportunidade|avançar oportunidade|estado da lead|agendar reunião|marcar reunião|entrar em contacto|avançar o processo de colaboração)\b/i;
const MAX_CLIENT_OBJECTIVE_LENGTH = 360;

export type ResolveInternalMeetingObjectiveInput = {
  meetingDescription?: string | null;
  leadActionDescription?: string | null;
  submissionSummary?: string | null;
  fallbackObjective?: string | null;
};

export function resolveInternalMeetingObjective({
  meetingDescription,
  leadActionDescription,
  submissionSummary,
  fallbackObjective,
}: ResolveInternalMeetingObjectiveInput): string {
  return (
    clean(meetingDescription) ??
    clean(leadActionDescription) ??
    clean(submissionSummary) ??
    clean(fallbackObjective) ??
    FALLBACK_INTERNAL_OBJECTIVE
  );
}

export function getMeetingSubmissionSummary(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const fields = payload as Record<string, unknown>;
  for (const key of [
    'meetingGoal',
    'summary',
    'mainChallenge',
    'processToAutomate',
    'description',
  ]) {
    const value = fields[key];
    if (typeof value === 'string' && clean(value)) {
      return clean(value);
    }
  }

  return undefined;
}

export async function transformInternalObjectiveForClient(input: {
  internalObjective: string;
  companyName?: string | null;
}): Promise<string> {
  const fallback = buildClientObjectiveFallback(input.companyName);

  try {
    const { client, model } = createGroqClient();
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.2,
        max_tokens: 140,
        messages: [
          {
            role: 'system',
            content:
              'És um assistente editorial da Norm8. Produzes texto profissional em Português Europeu e devolves apenas o texto final pedido.',
          },
          {
            role: 'user',
            content: buildMeetingClientObjectivePrompt(input),
          },
        ],
      },
      { timeout: 5_000 },
    );
    const objective = normalizeAiObjective(completion.choices[0]?.message.content);

    if (!objective || FORBIDDEN_CLIENT_LANGUAGE.test(objective)) {
      console.warn('Meeting client objective AI output failed safety validation.');
      return fallback;
    }

    return objective;
  } catch (error) {
    console.warn('Meeting client objective AI transformation failed; using fallback.', {
      reason: error instanceof Error ? error.message : 'Unknown AI error',
    });
    return fallback;
  }
}

export function buildMeetingClientObjectivePrompt({
  internalObjective,
  companyName,
}: {
  internalObjective: string;
  companyName?: string | null;
}): string {
  return [
    'Transforma o seguinte objetivo interno numa descrição curta e profissional do objetivo de uma reunião já confirmada com o cliente.',
    '',
    'Regras:',
    '- Escreve em Português Europeu.',
    '- Assume que a reunião já está marcada e confirmada.',
    '- Usa uma frase ou, no máximo, duas frases curtas.',
    '- Não uses frases como agendar reunião, marcar reunião ou entrar em contacto.',
    '- Não uses termos internos como lead, pipeline, funil comercial, qualificação, oportunidade comercial, ação pendente, potencial comercial, fechar oportunidade ou avançar oportunidade.',
    '- Não inventes dados nem prometas resultados.',
    '- Não menciones preços, prazos ou garantias.',
    '- Preserva o sentido útil do objetivo interno.',
    '- Foca em contexto, prioridades, processos, automação e próximos passos.',
    '',
    `Empresa: ${clean(companyName) ?? 'Não indicada'}`,
    `Objetivo interno: ${internalObjective}`,
    '',
    'Devolve apenas o objetivo final para o cliente.',
  ].join('\n');
}

export function buildClientObjectiveFallback(companyName?: string | null): string {
  const company = clean(companyName);
  return company
    ? `Alinhar o contexto da ${company}, perceber prioridades operacionais e identificar oportunidades de automação para definir próximos passos claros.`
    : 'Compreender melhor os processos atuais da empresa, identificar oportunidades de automação e definir próximos passos claros.';
}

function normalizeAiObjective(value?: string | null): string | undefined {
  const normalized = clean(value)
    ?.replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized && normalized.length <= MAX_CLIENT_OBJECTIVE_LENGTH
    ? normalized
    : undefined;
}

function clean(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized !== 'Sem resumo indicado' ? normalized : undefined;
}
