import EmailButton from '../components/EmailButton';
import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';

export type PreMeetingIntakeInternalNotificationEmailProps = {
  adminLeadUrl?: string;
  companyName: string;
  contactName?: string | null;
  email: string;
  phone?: string | null;
  websiteOrSocials?: string | null;
  businessArea: string;
  mainProblem: string;
  processToAutomate: string;
  currentTools: string;
  solutionObjective: string;
  notes?: string | null;
  submittedAt: string;
};

export const PRE_MEETING_INTAKE_INTERNAL_NOTIFICATION_SUBJECT_PREFIX = 'Nova pré-reunião recebida';

export function buildPreMeetingIntakeInternalNotificationPlainText(
  props: PreMeetingIntakeInternalNotificationEmailProps,
): string {
  const rows = getInternalRows(props);

  return [
    'Nova pré-reunião recebida',
    '',
    'Um cliente submeteu o formulário de preparação da reunião.',
    '',
    ...rows.map((row) => `${row.label}: ${row.value || 'Não indicado'}`),
    ...(props.adminLeadUrl ? ['', `Ver Lead no Admin: ${props.adminLeadUrl}`] : []),
    '',
    'Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis.',
  ].join('\n');
}

export default function PreMeetingIntakeInternalNotificationEmail(props: PreMeetingIntakeInternalNotificationEmailProps) {
  const rows = getInternalRows(props);
  const summaryRows = rows.slice(0, 7);
  const detailRows = rows.slice(7);

  return (
    <EmailShell maxWidth={760}>
      <EmailHeader
        label="Norm8 · Operação comercial"
        title="Nova pré-reunião recebida"
        description="Um cliente submeteu o formulário de preparação da reunião."
        meta={[
          { label: 'Empresa', value: props.companyName },
          { label: 'Setor', value: props.businessArea },
        ]}
      />

      <EmailSection title="Resumo inicial">
        <EmailCard>
          <DataTable rows={summaryRows} />
        </EmailCard>
      </EmailSection>

      <EmailSection title="Contexto submetido">
        <EmailCard>
          <DataTable rows={detailRows} />
        </EmailCard>
      </EmailSection>

      {props.adminLeadUrl ? (
        <EmailSection align="center" title="Ação interna">
          <EmailButton href={props.adminLeadUrl}>Ver Lead no Admin</EmailButton>
        </EmailSection>
      ) : null}

      <EmailFooter />
    </EmailShell>
  );
}

function DataTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <table cellPadding="0" cellSpacing="0" role="presentation" style={{ borderCollapse: 'collapse', width: '100%' }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td style={labelCellStyle}>{row.label}</td>
            <td style={valueCellStyle}>{row.value || 'Não indicado'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getInternalRows(props: PreMeetingIntakeInternalNotificationEmailProps): Array<{ label: string; value: string }> {
  return [
    { label: 'Lead', value: props.companyName },
    { label: 'Empresa', value: props.companyName },
    { label: 'Nome do contacto', value: props.contactName ?? '' },
    { label: 'Email', value: props.email },
    { label: 'Telefone', value: props.phone ?? '' },
    { label: 'Setor de atividade', value: props.businessArea },
    { label: 'Data de submissão', value: props.submittedAt },
    { label: 'Website ou redes sociais', value: props.websiteOrSocials ?? '' },
    { label: 'Principal problema', value: props.mainProblem },
    { label: 'Processo a automatizar', value: props.processToAutomate },
    { label: 'Ferramentas atuais', value: props.currentTools },
    { label: 'Objetivo da solução', value: props.solutionObjective },
    { label: 'Notas adicionais', value: props.notes ?? '' },
  ];
}

const labelCellStyle = {
  borderBottom: '1px solid #182034',
  color: '#8399B8',
  fontSize: 12,
  lineHeight: 1.5,
  padding: '10px 12px 10px 0',
  textTransform: 'uppercase' as const,
  verticalAlign: 'top' as const,
  width: '32%',
};

const valueCellStyle = {
  borderBottom: '1px solid #182034',
  color: '#DDE6F6',
  fontSize: 14,
  lineHeight: 1.55,
  padding: '10px 0',
  verticalAlign: 'top' as const,
  whiteSpace: 'pre-wrap' as const,
};