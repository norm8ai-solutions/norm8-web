import type { Norm8SelectOption } from '@/components/ui/norm8-select';

export const activitySectorOptions: Norm8SelectOption[] = [
  'Serviços Profissionais',
  'Consultoria',
  'Imobiliário',
  'Saúde e Clínicas',
  'Estética e Bem-estar',
  'Restauração',
  'Hotelaria e Turismo',
  'Educação e Formação',
  'E-commerce',
  'Retalho',
  'Construção',
  'Seguros',
  'Contabilidade e Finanças',
  'Jurídico',
  'Tecnologia / SaaS',
  'Marketing e Agências',
  'Automóvel',
  'Indústria',
  'Logística',
  'Outro',
].map((sector) => ({
  value: sector,
  label: sector,
}));