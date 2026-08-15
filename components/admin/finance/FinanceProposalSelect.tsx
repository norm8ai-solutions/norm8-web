'use client';

import { Norm8Select, type Norm8SelectOption } from '@/components/ui/norm8-select';

export type FinanceProposalOption = {
  createdAt: Date;
  id: string;
  label: string;
  leadId: string;
  status?: string | null;
  title: string;
};

type FinanceProposalSelectProps = {
  disabled?: boolean;
  helperText?: string;
  onChange: (proposalId: string | null) => void;
  placeholder?: string;
  proposals: FinanceProposalOption[];
  value?: string | null;
};

export function FinanceProposalSelect({
  disabled,
  helperText,
  onChange,
  placeholder = 'Selecionar proposta',
  proposals,
  value,
}: FinanceProposalSelectProps) {
  const options: Norm8SelectOption[] = [
    { label: 'Sem proposta associada', value: '' },
    ...proposals.map((proposal) => ({ label: proposal.label, value: proposal.id })),
  ];

  return (
    <div className="finance-proposal-select">
      <Norm8Select
        disabled={disabled}
        onValueChange={(nextValue) => onChange(nextValue || null)}
        options={options}
        placeholder={placeholder}
        value={value ?? ''}
      />
      {helperText ? <small className="admin-row-meta">{helperText}</small> : null}
    </div>
  );
}