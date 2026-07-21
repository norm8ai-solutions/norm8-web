import type { ContractPlan, ContractServiceType } from '@/app/generated/prisma/client';
import { CONTRACT_PLAN_LABELS, CONTRACT_SERVICE_TYPE_LABELS } from '@/lib/contracts/constants';

export type ContractScopeTemplateInput = {
  serviceType?: ContractServiceType | null;
  customServiceType?: string | null;
  plan?: ContractPlan | null;
  selectedPhases: string[];
  selectedServices: string[];
};

export type ContractScopeTemplateDeliverable = {
  title: string;
  description: string;
  phase: string;
  estimatedDate: string;
  responsible: string;
  acceptanceCriteria: string;
};

export type ContractScopeTemplate = {
  executiveSummary: string;
  projectObjective: string;
  identifiedProblems: string;
  proposedSolution: string;
  includedScope: string;
  excludedScope: string;
  acceptanceCriteria: string;
  deliverables: ContractScopeTemplateDeliverable[];
};

type BaseTemplate = {
  objective: string;
  problems: string[];
  solution: string;
  includedScope: string[];
  excludedScope: string[];
  acceptanceCriteria: string[];
  deliverables: Array<Omit<ContractScopeTemplateDeliverable, 'estimatedDate'>>;
};

const DEFAULT_EXCLUSIONS = [
  'Funcionalidades, automações ou integrações não descritas neste contrato.',
  'Alterações estruturais após aprovação do âmbito sem pedido de alteração formal.',
  'Custos de serviços externos, licenças, APIs, hosting ou ferramentas de terceiros.',
  'Suporte permanente fora do período contratado, salvo se estiver incluído no plano.',
];

const DEFAULT_ACCEPTANCE = [
  'Entregáveis concluídos de acordo com o âmbito aprovado.',
  'Testes realizados no ambiente definido para o projeto.',
  'Ausência de erros críticos conhecidos no momento da entrega.',
  'Aprovação formal ou tácita após o período de validação acordado.',
];

const SERVICE_TEMPLATES: Partial<Record<ContractServiceType, BaseTemplate>> = {
  WEBSITE: {
    objective: 'Desenvolver ou melhorar a presença digital do Cliente, garantindo uma experiência clara, responsiva e alinhada com os objetivos comerciais definidos.',
    problems: ['Presença digital desatualizada ou insuficiente.', 'Dificuldade em apresentar serviços, captar leads ou comunicar valor de forma estruturada.'],
    solution: 'A Norm8 irá estruturar, desenhar, implementar e testar a solução web acordada, incluindo os conteúdos, páginas e integrações definidos neste contrato.',
    includedScope: ['Levantamento de objetivos e conteúdos.', 'Estruturação de páginas e navegação.', 'Implementação da interface web.', 'Configuração técnica essencial.', 'Testes funcionais e responsive.', 'Entrega em ambiente definido.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: ['Páginas principais implementadas e testadas.', 'Experiência validada em desktop e mobile.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Levantamento e estrutura do website', 'Mapeamento de páginas, objetivos, conteúdos e prioridades da presença digital.', 'LAUNCH', 'Norm8 e Cliente', ['Páginas principais identificadas.', 'Conteúdos necessários listados.', 'Estrutura de navegação validada.']),
      deliverable('Website implementado', 'Implementação das páginas, componentes e configurações técnicas acordadas.', 'LAUNCH', 'Norm8', ['Páginas acordadas implementadas.', 'Interface responsive validada.', 'Sem erros críticos conhecidos no momento da entrega.']),
      deliverable('Testes e publicação', 'Validação funcional e publicação no ambiente definido.', 'LAUNCH', 'Norm8', ['Fluxo principal testado.', 'Ambiente de publicação validado.', 'Acesso final comunicado ao Cliente.']),
    ],
  },
  CUSTOM_SOFTWARE: {
    objective: 'Desenvolver uma solução de software personalizada, alinhada com os requisitos funcionais, operacionais e comerciais definidos com o Cliente.',
    problems: ['Necessidade de centralizar processos ou informação em ferramentas ajustadas à operação.', 'Limitações de ferramentas genéricas face ao fluxo real de trabalho.'],
    solution: 'A Norm8 irá desenhar, desenvolver, testar e entregar uma solução de software personalizada, incluindo os módulos e fluxos acordados neste contrato.',
    includedScope: ['Levantamento funcional e técnico inicial.', 'Definição da arquitetura da solução.', 'Desenvolvimento das funcionalidades acordadas.', 'Implementação da interface de utilização.', 'Testes funcionais.', 'Publicação/entrega em ambiente definido.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: ['Funcionalidades implementadas de acordo com o âmbito aprovado.', 'Interface validada pelo Cliente.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Levantamento funcional e técnico', 'Mapeamento dos requisitos, processos atuais, prioridades e restrições técnicas do projeto.', 'LAUNCH', 'Norm8 e Cliente', ['Requisitos principais documentados.', 'Processos atuais identificados.', 'Prioridades de implementação validadas com o Cliente.']),
      deliverable('Arquitetura funcional da solução', 'Estrutura funcional e técnica da solução a desenvolver.', 'LAUNCH', 'Norm8', ['Arquitetura funcional aprovada.', 'Principais módulos e integrações identificados.', 'Decisões técnicas documentadas.']),
      deliverable('Módulo principal desenvolvido', 'Implementação do módulo central da solução.', 'LAUNCH', 'Norm8', ['Funcionalidades implementadas de acordo com o âmbito aprovado.', 'Fluxos principais operacionais.', 'Sem erros críticos conhecidos no momento da entrega.']),
      deliverable('Testes e validação', 'Execução de testes funcionais e ajustes de validação.', 'LAUNCH', 'Norm8 e Cliente', ['Cenários principais testados.', 'Erros críticos corrigidos.', 'Resultados de validação partilhados com o Cliente.']),
    ],
  },
  PROCESS_AUTOMATION: {
    objective: 'Automatizar processos operacionais para reduzir trabalho manual, erros recorrentes e tempo de execução.',
    problems: ['Processos manuais repetitivos.', 'Dependência de tarefas administrativas com baixo valor acrescentado.', 'Risco de falhas por transferência manual de dados.'],
    solution: 'A Norm8 irá mapear o processo atual, configurar fluxos automatizados e testar os cenários definidos com o Cliente.',
    includedScope: ['Diagnóstico do processo atual.', 'Mapeamento do fluxo operacional.', 'Configuração da automação.', 'Integração com ferramentas existentes quando aplicável.', 'Testes com cenários reais.', 'Documentação do fluxo.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: ['Fluxos automatizados executados com os cenários acordados.', 'Regras de automação validadas pelo Cliente.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Diagnóstico do processo atual', 'Análise do fluxo operacional e pontos de automação.', 'LAUNCH', 'Norm8 e Cliente', ['Processo atual documentado.', 'Pontos de automação identificados.', 'Prioridades validadas com o Cliente.']),
      deliverable('Fluxo automatizado configurado', 'Configuração da automação nos sistemas definidos.', 'LAUNCH', 'Norm8', ['Fluxo configurado no ambiente definido.', 'Regras principais implementadas.', 'Execução testada com cenários acordados.']),
      deliverable('Testes com cenários reais', 'Validação dos fluxos com exemplos operacionais.', 'LAUNCH', 'Norm8 e Cliente', ['Cenários principais testados.', 'Erros críticos corrigidos.', 'Resultados de validação partilhados com o Cliente.']),
    ],
  },
  AI_AGENTS: {
    objective: 'Implementar agente(s) de IA para apoiar processos de atendimento, operação, análise ou produtividade.',
    problems: ['Necessidade de responder ou executar tarefas com maior rapidez.', 'Conhecimento disperso em documentos, ferramentas ou equipas.', 'Tarefas repetitivas com potencial de apoio por IA.'],
    solution: 'A Norm8 irá configurar o agente, as instruções, a base de conhecimento e os fluxos necessários para o caso de uso definido.',
    includedScope: ['Definição do caso de uso do agente.', 'Configuração da base de conhecimento/instruções.', 'Implementação do fluxo conversacional.', 'Integrações necessárias quando aplicável.', 'Testes de respostas e limites.', 'Ajustes de tom e regras.'],
    excludedScope: [...DEFAULT_EXCLUSIONS, 'Garantia de respostas perfeitas em todos os cenários não treinados ou não previstos.'],
    acceptanceCriteria: ['Agente responde de acordo com as instruções e limites definidos.', 'Base de conhecimento validada pelo Cliente.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Definição do caso de uso do agente', 'Descrição do objetivo, limites e contexto operacional do agente.', 'LAUNCH', 'Norm8 e Cliente', ['Caso de uso documentado.', 'Limites principais definidos.', 'Critérios de sucesso validados com o Cliente.']),
      deliverable('Agente IA configurado', 'Configuração das instruções, base de conhecimento e fluxos principais.', 'LAUNCH', 'Norm8', ['Instruções principais configuradas.', 'Base de conhecimento carregada ou ligada.', 'Fluxo principal operacional.']),
      deliverable('Testes de respostas e limites', 'Validação do comportamento do agente nos cenários acordados.', 'LAUNCH', 'Norm8 e Cliente', ['Cenários principais testados.', 'Limites de resposta avaliados.', 'Ajustes críticos incorporados.']),
    ],
  },
  SYSTEM_INTEGRATION: {
    objective: 'Integrar sistemas, ferramentas ou fontes de dados para melhorar a sincronização e continuidade operacional.',
    problems: ['Dados dispersos entre ferramentas.', 'Necessidade de reduzir duplicação de tarefas.', 'Falta de sincronização entre sistemas críticos.'],
    solution: 'A Norm8 irá levantar as ferramentas a integrar, definir dados/triggers, configurar APIs ou webhooks e validar a sincronização.',
    includedScope: ['Levantamento das ferramentas a integrar.', 'Definição de dados e triggers.', 'Configuração de APIs/webhooks.', 'Testes de sincronização.', 'Documentação técnica básica.', 'Monitorização inicial.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: ['Dados sincronizados conforme regras acordadas.', 'Triggers testados com cenários definidos.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Mapa de integração', 'Identificação de sistemas, dados, triggers e regras de sincronização.', 'LAUNCH', 'Norm8 e Cliente', ['Sistemas envolvidos identificados.', 'Dados e triggers documentados.', 'Regras de sincronização validadas.']),
      deliverable('Integrações configuradas', 'Configuração das ligações técnicas acordadas.', 'LAUNCH', 'Norm8', ['Integrações configuradas com as ferramentas acordadas.', 'Sincronização de dados testada.', 'Falhas críticas documentadas ou corrigidas.']),
      deliverable('Testes de sincronização', 'Validação de fluxos de dados entre sistemas.', 'LAUNCH', 'Norm8 e Cliente', ['Cenários principais testados.', 'Erros críticos corrigidos.', 'Resultados de validação partilhados com o Cliente.']),
    ],
  },
  TECHNOLOGY_CONSULTING: {
    objective: 'Apoiar o Cliente na clarificação, priorização e planeamento de iniciativas tecnológicas.',
    problems: ['Necessidade de priorizar iniciativas digitais.', 'Falta de clareza sobre arquitetura, ferramentas ou roadmap.', 'Decisões tecnológicas com impacto operacional e comercial.'],
    solution: 'A Norm8 irá realizar diagnóstico, recomendações e plano de implementação ajustado à realidade do Cliente.',
    includedScope: ['Diagnóstico inicial.', 'Relatório de recomendações.', 'Plano de implementação.', 'Sessões de alinhamento.', 'Priorização de iniciativas.', 'Roadmap operacional.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: ['Recomendações entregues e discutidas com o Cliente.', 'Roadmap priorizado e validado.', ...DEFAULT_ACCEPTANCE],
    deliverables: [
      deliverable('Diagnóstico inicial', 'Análise do contexto, problemas e oportunidades tecnológicas.', 'LAUNCH', 'Norm8 e Cliente', ['Contexto documentado.', 'Problemas e oportunidades identificados.', 'Prioridades validadas com o Cliente.']),
      deliverable('Relatório de recomendações', 'Recomendações práticas e priorizadas.', 'LAUNCH', 'Norm8', ['Recomendações documentadas.', 'Impacto e esforço considerados.', 'Recomendações discutidas com o Cliente.']),
      deliverable('Roadmap operacional', 'Plano de implementação por fases.', 'LAUNCH', 'Norm8', ['Roadmap por fases definido.', 'Dependências principais identificadas.', 'Próximos passos acordados.']),
    ],
  },
  OTHER: {
    objective: 'Executar o serviço acordado com o Cliente de acordo com o âmbito, fases e entregáveis definidos neste contrato.',
    problems: ['Necessidade de estruturar o trabalho contratado em entregáveis claros.', 'Necessidade de alinhar responsabilidades, critérios e limites do projeto.'],
    solution: 'A Norm8 irá executar o serviço definido, organizando atividades, entregáveis e validação de acordo com o plano aprovado.',
    includedScope: ['Levantamento inicial do contexto.', 'Planeamento do trabalho a executar.', 'Execução dos entregáveis acordados.', 'Validação com o Cliente.', 'Ajustes previstos no âmbito contratado.'],
    excludedScope: DEFAULT_EXCLUSIONS,
    acceptanceCriteria: DEFAULT_ACCEPTANCE,
    deliverables: [
      deliverable('Levantamento inicial', 'Recolha de contexto e alinhamento do trabalho a executar.', 'LAUNCH', 'Norm8 e Cliente', ['Contexto inicial documentado.', 'Trabalho a executar alinhado.', 'Prioridades validadas com o Cliente.']),
      deliverable('Entrega principal do serviço', 'Execução do entregável principal definido para o contrato.', 'LAUNCH', 'Norm8', ['Entregável principal concluído.', 'Âmbito aprovado respeitado.', 'Validação partilhada com o Cliente.']),
    ],
  },
};

const SERVICE_DELIVERABLES: Record<string, Omit<ContractScopeTemplateDeliverable, 'estimatedDate'>> = {
  Discovery: deliverable('Levantamento e diagnóstico', 'Recolha de requisitos, contexto, prioridades e restrições do projeto.', 'LAUNCH', 'Norm8 e Cliente', ['Requisitos principais documentados.', 'Processos atuais identificados.', 'Prioridades validadas com o Cliente.']),
  Arquitetura: deliverable('Arquitetura funcional/técnica', 'Definição da estrutura funcional, técnica ou operacional da solução.', 'LAUNCH', 'Norm8', ['Arquitetura funcional aprovada.', 'Principais módulos e integrações identificados.', 'Decisões técnicas documentadas.']),
  'UI/UX': deliverable('Protótipo ou interface inicial', 'Desenho da experiência, fluxos principais e interface de utilização.', 'LAUNCH', 'Norm8', ['Interface validada visualmente.', 'Fluxos principais representados.', 'Ajustes críticos incorporados.']),
  Desenvolvimento: deliverable('Desenvolvimento da solução', 'Implementação das funcionalidades ou componentes acordados.', 'LAUNCH', 'Norm8', ['Funcionalidades implementadas de acordo com o âmbito aprovado.', 'Fluxos principais operacionais.', 'Sem erros críticos conhecidos no momento da entrega.']),
  Implementação: deliverable('Implementação/configuração', 'Configuração e implementação da solução no ambiente definido.', 'LAUNCH', 'Norm8', ['Solução configurada no ambiente definido.', 'Acesso validado pelas partes.', 'Fluxo principal testado com sucesso.']),
  Integrações: deliverable('Integrações configuradas', 'Configuração das integrações com ferramentas e sistemas identificados.', 'LAUNCH', 'Norm8', ['Integrações configuradas com as ferramentas acordadas.', 'Sincronização de dados testada.', 'Falhas críticas documentadas ou corrigidas.']),
  Testes: deliverable('Testes funcionais', 'Validação funcional dos fluxos e entregáveis acordados.', 'LAUNCH', 'Norm8 e Cliente', ['Cenários principais testados.', 'Erros críticos corrigidos.', 'Resultados de validação partilhados com o Cliente.']),
  Publicação: deliverable('Deploy/publicação', 'Publicação ou entrega da solução no ambiente acordado.', 'LAUNCH', 'Norm8', ['Solução publicada no ambiente definido.', 'Acesso final validado.', 'Configuração principal testada.']),
  Formação: deliverable('Sessão de formação inicial', 'Sessão de formação para utilização e operação inicial.', 'LAUNCH', 'Norm8', ['Sessão de formação realizada.', 'Utilizadores principais orientados.', 'Dúvidas iniciais esclarecidas.']),
  Suporte: deliverable('Suporte inicial', 'Apoio inicial após entrega para estabilização do projeto.', 'OPERATE', 'Norm8', ['Período de suporte inicial definido.', 'Canal de suporte comunicado.', 'Pedidos iniciais acompanhados.']),
  Analytics: deliverable('Relatórios analíticos', 'Configuração de métricas, eventos ou relatórios de acompanhamento.', 'LAUNCH', 'Norm8', ['Métricas principais configuradas.', 'Relatórios acessíveis.', 'Dados de teste validados.']),
  SEO: deliverable('Otimização técnica/SEO', 'Configuração de elementos técnicos de SEO quando aplicável.', 'LAUNCH', 'Norm8', ['Elementos técnicos configurados.', 'Páginas principais verificadas.', 'Recomendações partilhadas com o Cliente.']),
  Automações: deliverable('Fluxos automatizados', 'Configuração dos fluxos automáticos definidos.', 'LAUNCH', 'Norm8', ['Fluxos configurados.', 'Cenários principais testados.', 'Erros críticos corrigidos.']),
  CRM: deliverable('Configuração/integração CRM', 'Configuração ou integração com CRM conforme âmbito aprovado.', 'LAUNCH', 'Norm8', ['CRM configurado ou integrado.', 'Campos principais validados.', 'Fluxo principal testado com sucesso.']),
  Dashboards: deliverable('Dashboards operacionais', 'Criação de dashboards ou painéis de acompanhamento operacional.', 'LAUNCH', 'Norm8', ['Dashboards principais criados.', 'Métricas validadas.', 'Acesso confirmado pelas partes.']),
  'Agentes IA': deliverable('Agente IA', 'Configuração de agente IA para o caso de uso definido.', 'LAUNCH', 'Norm8', ['Agente configurado.', 'Base de conhecimento validada.', 'Cenários principais testados.']),
  Manutenção: deliverable('Plano de manutenção', 'Definição ou execução de atividades de manutenção incluídas.', 'OPERATE', 'Norm8', ['Plano de manutenção definido.', 'Responsabilidades clarificadas.', 'Canal de acompanhamento comunicado.']),
  'Evolução contínua': deliverable('Plano de evolução contínua', 'Priorização e execução de melhorias contínuas acordadas.', 'SCALE', 'Norm8 e Cliente', ['Melhorias priorizadas.', 'Roadmap de evolução definido.', 'Próximas ações validadas.']),
};

export function getContractScopeTemplate(input: ContractScopeTemplateInput): ContractScopeTemplate {
  const base = SERVICE_TEMPLATES[input.serviceType ?? 'OTHER'] ?? SERVICE_TEMPLATES.OTHER!;
  const serviceLabel = input.serviceType === 'OTHER'
    ? input.customServiceType?.trim() || 'serviço personalizado'
    : input.serviceType
      ? CONTRACT_SERVICE_TYPE_LABELS[input.serviceType]
      : 'serviço contratado';
  const planLabel = input.plan ? CONTRACT_PLAN_LABELS[input.plan] : 'plano definido';
  const phaseText = input.selectedPhases.length > 0 ? input.selectedPhases.join(', ') : 'fases selecionadas';
  const selectedDeliverables = input.selectedServices.map((service) => SERVICE_DELIVERABLES[service]).filter(Boolean);
  const deliverables = addEstimatedDates(uniqueDeliverables([...base.deliverables, ...selectedDeliverables]));

  return {
    executiveSummary: `Contrato para ${serviceLabel}, no ${planLabel}, organizado pelas fases ${phaseText}. O âmbito proposto consolida objetivos, entregáveis e critérios de aceitação para uma execução clara e validável.`,
    projectObjective: base.objective,
    identifiedProblems: formatList(base.problems),
    proposedSolution: base.solution,
    includedScope: formatList(uniqueStrings([...base.includedScope, ...scopeItemsFromServices(input.selectedServices)])),
    excludedScope: formatList(base.excludedScope),
    acceptanceCriteria: formatList(base.acceptanceCriteria),
    deliverables,
  };
}

function deliverable(title: string, description: string, phase: string, responsible: string, acceptanceCriteria: string[]): Omit<ContractScopeTemplateDeliverable, 'estimatedDate'> {
  return { title, description, phase, responsible, acceptanceCriteria: formatList(acceptanceCriteria) };
}

function addEstimatedDates(items: Array<Omit<ContractScopeTemplateDeliverable, 'estimatedDate'>>): ContractScopeTemplateDeliverable[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return items.map((item, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + ((index + 1) * 7));
    return { ...item, estimatedDate: formatDateOnly(date) };
  });
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatList(items: string[]): string {
  return uniqueStrings(items).map((item) => `- ${item}`).join('\n');
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function uniqueDeliverables(items: Array<Omit<ContractScopeTemplateDeliverable, 'estimatedDate'>>): Array<Omit<ContractScopeTemplateDeliverable, 'estimatedDate'>> {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scopeItemsFromServices(services: string[]): string[] {
  return services.map((service) => {
    const deliverableItem = SERVICE_DELIVERABLES[service];
    return deliverableItem ? `${deliverableItem.title}: ${deliverableItem.description}` : '';
  }).filter(Boolean);
}