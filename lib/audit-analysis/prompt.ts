/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/prompt.ts
 * Description: Prompt builder for Intelligent Audit AI analysis.
 * Responsibilities:
 * - Convert a validated audit request payload into a focused AI prompt.
 * - Ask for internal analysis, sales playbook, roadmap, and client-safe preview.
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
    'Es um consultor senior da Norm8 especializado em automacao operacional B2B.',
    'Analisa pedidos de Auditoria Inteligente para identificar oportunidades comerciais reais e preparar discovery calls praticas.',
    'Tens de devolver apenas JSON valido, sem markdown, sem comentarios e sem texto fora do objecto JSON.',
    'Usa portugues europeu, tom profissional, consultivo, directo, premium e claro.',
    'Nao inventes dados que nao estejam no formulario; quando necessario, faz inferencias prudentes e conservadoras.',
    'O output tem tres camadas: analise interna, playbook/roadmap internos, e preview executivo seguro para o cliente.',
    'salesPlaybook, implementationRoadmap, closingProbability e dados comerciais sao apenas internos.',
    'A versao cliente nunca pode revelar score, prioridade comercial, potencial de contrato, probabilidade de fecho, objecoes, cross-sell, margens, pipeline, notas internas ou linguagem de venda interna.',
    'A versao cliente nunca deve prometer resultados especificos, percentagens inventadas ou ganhos garantidos.',
  ].join('\n');
}

/**
 * Builds the user prompt using only submitted audit form data.
 *
 * @param payload Validated audit request payload.
 * @returns Prompt containing business context and the expected JSON contract.
 */
export function buildAuditAnalysisUserPrompt(payload: AuditRequestInput): string {
  return `Analisa esta submissao de Auditoria Inteligente da Norm8.

Dados da empresa:
- Nome do contacto: ${payload.name}
- Empresa: ${payload.company}
- Website: ${payload.website ?? 'Nao indicado'}
- Email: ${payload.email}
- Telefone: ${payload.phone ?? 'Nao indicado'}
- Setor: ${payload.industry}
- Colaboradores: ${payload.employees}
- Receita anual: ${payload.annualRevenue ?? 'Nao indicado'}
- Ferramentas usadas: ${payload.toolsUsed ?? 'Nao indicado'}
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
  "contractValueEstimate": {
    "minimum": 30000,
    "maximum": 45000,
    "currency": "EUR",
    "confidence": "LOW | MEDIUM | HIGH",
    "rationale": "..."
  },
  "implementationComplexity": "LOW | MEDIUM | HIGH",
  "estimatedDelivery": {
    "range": "2-4 semanas | 4-8 semanas | 8-16 semanas",
    "rationale": "..."
  },
  "closingProbability": 78,
  "closingProbabilityRationale": "...",
  "commercialRationale": "...",
  "salesPlaybook": {
    "likelyDecisionMaker": "CEO | COO | Head of Operations | Sales Director | Clinic Manager | ...",
    "painPoints": ["...", "...", "..."],
    "likelyObjections": [
      {
        "objection": "...",
        "response": "..."
      }
    ],
    "quickWins": ["...", "...", "..."],
    "futureCrossSell": ["AI Agents", "Knowledge Hub", "Customer Support AI"],
    "closingProbability": 78,
    "salesStrategy": "...",
    "discoveryQuestions": ["...", "...", "..."]
  },
  "implementationRoadmap": [
    {
      "phase": 1,
      "title": "...",
      "description": "...",
      "objective": "...",
      "deliverables": ["..."],
      "estimatedDuration": "2-4 semanas",
      "dependencies": ["..."],
      "expectedImpact": "...",
      "complexity": "LOW | MEDIUM | HIGH"
    }
  ],
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

Criterios da analise interna:
- score deve estar entre 0 e 100.
- priority deve reflectir urgencia comercial e potencial de automacao.
- inclui 3 a 5 problemas operacionais.
- inclui 3 a 5 oportunidades de automacao.
- inclui 2 a 4 solucoes recomendadas.
- nextStep deve ser accionavel para a equipa comercial da Norm8.
- closingProbability deve considerar urgencia, dimensao, clareza do objetivo, maturidade digital, complexidade, potencial de orcamento e alinhamento com solucoes Norm8.
- closingProbabilityRationale deve explicar a probabilidade de fecho em 1 a 2 frases.

Criterios do salesPlaybook:
- incluir 3 a 5 painPoints.
- incluir 3 a 5 likelyObjections, cada uma com response consultiva, curta e profissional.
- incluir 3 a 5 quickWins implementaveis numa primeira fase.
- incluir 3 a 6 oportunidades de futureCrossSell realistas.
- discoveryQuestions deve ter 5 a 8 perguntas praticas para a primeira reuniao.
- likelyDecisionMaker e obrigatorio e nunca pode ser Nao identificado, Unknown, N/A ou vazio; se necessario, inferir por setor e dimensao da empresa.
- salesStrategy deve explicar como conduzir a discovery call sem linguagem agressiva.

Criterios do implementationRoadmap:
- incluir obrigatoriamente 3 a 5 fases ordenadas por phase; nunca devolver apenas uma fase.
- cada fase deve ter titulo, descricao, objective, deliverables, estimatedDuration, dependencies, expectedImpact e complexity.
- evitar promessas impossiveis; usar estimativas prudentes.
- transformar a analise numa sequencia clara de implementacao.

Criterios do clientPreview:
- escrever directamente para o cliente, nao para a equipa Norm8.
- usar explicitamente o contexto do formulario: setor, ferramentas usadas, principal desafio operacional e objetivo principal.
- nao devolver frases genericas quando o formulario tiver informacao suficiente; cada bloco deve parecer escrito para esta empresa.
- summary deve ter 2 a 4 frases e explicar o ponto de partida operacional sem repetir literalmente o desafio do formulario.
- devolver exactamente 3 opportunities, cada uma com titulo concreto e descricao pratica ligada ao desafio, ferramentas ou objetivo indicados.
- expectedBenefits deve ter entre 4 e 6 itens, especificos e verificaveis em discovery, sem percentagens nem promessas garantidas.
- recommendedDirection deve propor uma direccao concreta de solucao: fluxos a automatizar, sistemas a ligar e visibilidade a criar.
- nextStep deve ser accionavel: preparar uma reuniao de 30 minutos para validar processo actual, ferramentas, prioridades e uma primeira fase de implementacao.
- nao incluir score, prioridade comercial, valor potencial, probabilidade de fecho, objecoes, cross-sell, margens, pipeline, notas internas ou linguagem de venda interna.
- nao prometer resultados especificos nem usar percentagens inventadas.`;
}


