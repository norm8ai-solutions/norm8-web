/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/prompt.ts
 * Description: Prompt builder for Intelligent Audit AI analysis.
 * Responsibilities:
 * - Convert a validated audit request payload into a focused AI prompt.
 * - Ask for internal analysis and a client-safe Executive Audit Preview.
 * - Keep prompt wording separated from service and persistence logic.
 * ------------------------------------------------------------------
 */

import type { AuditRequestInput } from '@/lib/leads/schemas';

/**
 * Builds the system prompt that constrains the audit analysis output.
 *
 * @returns System prompt for the AI audit analyst.
 */
export function buildAuditAnalysisSystemPrompt(): string {
  return [
    'És um consultor sénior da Norm8 especializado em automação operacional B2B.',
    'Analisa pedidos de Auditoria Inteligente para identificar oportunidades comerciais reais.',
    'Tens de devolver apenas JSON válido, sem markdown, sem comentários e sem texto fora do objecto JSON.',
    'Usa português europeu, tom profissional, consultivo, directo, premium e claro.',
    'Não inventes dados que não estejam no formulário; quando necessário, faz inferências prudentes e declara-as de forma conservadora.',
    'O output tem duas camadas: análise interna para a equipa Norm8 e preview executivo seguro para o cliente.',
    'A versão cliente nunca pode revelar score, prioridade comercial, potencial de contrato, margens, pipeline, notas internas ou linguagem de venda interna.',
    'A versão cliente nunca deve prometer resultados específicos, percentagens inventadas ou ganhos garantidos.',
  ].join('\n');
}

/**
 * Builds the user prompt using only submitted audit form data.
 *
 * @param payload Validated audit request payload.
 * @returns Prompt containing business context and the expected JSON contract.
 */
export function buildAuditAnalysisUserPrompt(payload: AuditRequestInput): string {
  return `Analisa esta submissão de Auditoria Inteligente da Norm8.

Dados da empresa:
- Nome do contacto: ${payload.name}
- Empresa: ${payload.company}
- Website: ${payload.website ?? 'Não indicado'}
- Email: ${payload.email}
- Telefone: ${payload.phone ?? 'Não indicado'}
- Setor: ${payload.industry}
- Colaboradores: ${payload.employees}
- Receita anual: ${payload.annualRevenue ?? 'Não indicado'}
- Ferramentas usadas: ${payload.toolsUsed ?? 'Não indicado'}
- Principal desafio operacional: ${payload.mainChallenge}
- Objetivo principal: ${payload.mainGoal}

Devolve exactamente este JSON:
{
  "score": 0,
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "companySummary": "...",
  "operationalProblems": [
    {
      "title": "...",
      "description": "...",
      "impact": "..."
    }
  ],
  "automationOpportunities": [
    {
      "title": "...",
      "description": "...",
      "estimatedImpact": "...",
      "complexity": "LOW | MEDIUM | HIGH"
    }
  ],
  "recommendedSolutions": [
    {
      "title": "...",
      "description": "...",
      "module": "Sales | Marketing | Operations | Customer Support | Internal Systems"
    }
  ],
  "nextStep": "...",
  "internalSummary": "...",
  "clientPreview": {
    "title": "...",
    "summary": "...",
    "opportunities": [
      {
        "title": "...",
        "description": "..."
      }
    ],
    "expectedBenefits": [
      "..."
    ],
    "recommendedDirection": "...",
    "nextStep": "..."
  }
}

Critérios da análise interna:
- score deve estar entre 0 e 100.
- priority deve reflectir urgência comercial e potencial de automação.
- inclui 3 a 5 problemas operacionais.
- inclui 3 a 5 oportunidades de automação.
- inclui 2 a 4 soluções recomendadas.
- nextStep deve ser accionável para a equipa comercial da Norm8.

Critérios do clientPreview:
- escrever directamente para o cliente, não para a equipa Norm8.
- máximo 3 opportunities.
- expectedBenefits deve ter entre 3 e 5 itens.
- não incluir score, prioridade comercial, valor potencial, margens, pipeline, notas internas ou linguagem de venda interna.
- não prometer resultados específicos nem usar percentagens inventadas.
- recommendedDirection deve explicar a possível direcção da solução de forma consultiva.
- nextStep deve preparar o cliente para uma revisão pela equipa Norm8.`;
}