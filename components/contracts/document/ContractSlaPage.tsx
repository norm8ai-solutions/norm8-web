import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

const priorities = [
  ['Prioridade crítica', 'Sistema indisponível; falha que impede a operação principal; perda grave de funcionalidade.', 'Até 4 horas úteis.'],
  ['Prioridade alta', 'Funcionalidade importante indisponível; impacto operacional significativo; existência de workaround limitado.', 'Até 1 dia útil.'],
  ['Prioridade normal', 'Erros não críticos; questões técnicas; ajustes menores.', 'Até 2 dias úteis.'],
  ['Prioridade baixa', 'Melhorias; pedidos de otimização; alterações cosméticas; sugestões.', 'Até 5 dias úteis.'],
];

export function ContractSlaPage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="SLA">
      <SectionHeading title="SLA" lead="Tempos de resposta base aplicáveis ao suporte contratado." />
      <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Prioridade</th><th>Critérios</th><th>Resposta inicial</th></tr></thead><tbody>{priorities.map(([name, criteria, response]) => <tr key={name}><td>{name}</td><td>{criteria}</td><td>{response}</td></tr>)}</tbody></table></div>
      <div className="contract-card"><strong>Notas</strong><span>O tempo de resposta não equivale ao tempo de resolução. O SLA aplica-se apenas durante horários úteis e pode depender do plano Operate. Falhas causadas por serviços terceiros não ficam totalmente sob controlo da Norm8. Intervenções fora de horário podem implicar custo adicional.</span></div>
    </ContractPageFrame>
  );
}