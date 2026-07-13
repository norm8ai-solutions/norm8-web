import type { Proposal } from '@/app/generated/prisma/client';

export type ProposalPdfContext = {
 generatedAt: Date;
 proposal: Proposal;
};

export type ProposalPdfSection = {
 title: string;
 body: string[];
 variant?: 'default' | 'investment';
};

export type ProposalPdfTemplate = {
 eyebrow: string;
 title: string;
 subtitle: string;
 companyName: string;
 contactName: string;
 generatedAtLabel: string;
 versionLabel: string;
 sections: ProposalPdfSection[];
 footer: string;
};

export function buildProposalPdfTemplate({
 generatedAt,
 proposal,
}: ProposalPdfContext): ProposalPdfTemplate {
 const contactName = proposal.contactName?.trim() || 'Contacto a confirmar';
 const estimatedValue = formatEstimatedValue(proposal.estimatedValue);

 return {
 eyebrow: 'PROPOSTA COMERCIAL',
 title: proposal.title?.trim() || `Proposta Norm8 para ${proposal.companyName}`,
 subtitle: 'Sistemas de IA para operações mais claras, rápidas e escaláveis.',
 companyName: proposal.companyName,
 contactName,
 generatedAtLabel: `Data: ${formatDatePt(generatedAt)}`,
 versionLabel: `Versão: v${proposal.version}`,
 sections: [
 {
 title: 'Contexto da oportunidade',
 body: [
 `Cliente: ${proposal.companyName}`,
 `Contacto: ${contactName}`,
 buildOpportunityContext(proposal),
 ],
 },
 {
 title: 'Problemas identificados',
 body: [
 normalizePdfText(
 proposal.painPoints,
 'As dores operacionais específicas devem ser validadas com a equipa antes da versão final.',
 ),
 ],
 },
 {
 title: 'Solução recomendada',
 body: [
 normalizePdfText(
 proposal.recommendedSolution,
 'A solução recomendada será ajustada ao diagnóstico final e às prioridades da equipa.',
 ),
 ],
 },


 {
 title: 'Plano de implementação',
 body: [
 formatImplementationPlan(
 normalizePdfText(
 proposal.implementationPlan,
 'Plano de implementação a detalhar em fases, com validação, entrega inicial e acompanhamento.',
 ),
 ),
 ],
 },
 ...(estimatedValue
 ? [
 {
 title: 'Estimativa de investimento',
 body: [
 estimatedValue,
 'Valor estimado sujeito a validação final de prioridades, integrações e esforço de implementação.',
 ],
 variant: 'investment' as const,
 },
 ]
 : []),
 {
 title: 'Próximos passos',
 body: [
 normalizePdfText(
 proposal.nextSteps,
 'Confirmar prioridades, validar o processo inicial a automatizar e alinhar o calendário de implementação.',
 ),
 ],
 },
 ],
 footer: 'Norm8 - Sistemas de IA para operações mais claras, rápidas e escaláveis. norm8.pt',
 };
}

function buildOpportunityContext(proposal: Proposal): string {
 const painPoints = normalizePdfText(
 proposal.painPoints,
 'as prioridades operacionais ainda devem ser validadas com a equipa',
 );
 const solution = normalizePdfText(
 proposal.recommendedSolution,
 'uma solução faseada de automação e IA adaptada aos processos prioritários',
 );

 return `Esta proposta parte do contexto operacional identificado para ${proposal.companyName}, com foco em ${summarizeForContext(painPoints)}. A direção recomendada é ${summarizeForContext(solution)}.`;
}

function summarizeForContext(value: string): string {
 return value
 .replace(/\s+/g, ' ')
 .replace(/[.;:]\s*$/, '')
 .slice(0, 220)
 .trim();
}
function normalizePdfText(value: string | null | undefined, fallback: string): string {
 return (value?.trim() || fallback)
 .replace(/\r\n/g, '\n')
 .replace(/\s+\n/g, '\n')
 .replace(/\n{3,}/g, '\n\n')
 .trim();
}

function formatImplementationPlan(value: string): string {
 const phasePattern = /Fase\s+(\d+)\s*:\s*([^]+?)(?=\s*Fase\s+\d+\s*:|$)/gi;
 const phases = [...value.matchAll(phasePattern)];

 if (phases.length < 2) {
 return value;
 }

 return phases
 .map((phase) => `Fase ${phase[1]} - ${phase[2].trim().replace(/\s+/g, ' ')}`)
 .join('\n');
}

function formatEstimatedValue(value: Proposal['estimatedValue']): string | null {
 if (!value) {
 return null;
 }

 const amount = Number(value.toString());
 if (!Number.isFinite(amount) || amount <= 0) {
 return null;
 }

 const formattedAmount = new Intl.NumberFormat('pt-PT', {
 maximumFractionDigits: 0,
 minimumFractionDigits: 0,
 }).format(amount);

 return `EUR ${formattedAmount}`;
}

function formatDatePt(date: Date): string {
 return new Intl.DateTimeFormat('pt-PT', {
 dateStyle: 'long',
 timeZone: 'Europe/Lisbon',
 }).format(date);
}
