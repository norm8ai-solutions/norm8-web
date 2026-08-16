import type { FinanceForecastMetrics } from '@/lib/admin/finance-forecast';
import { formatCurrencyCents } from '@/lib/finance/formatters';
import type { FinanceAlert } from './finance-alerts';

export function buildNegativeForecastAlert(forecast: Pick<FinanceForecastMetrics, 'expectedProfitCents'> | null | undefined): FinanceAlert | null {
  if (!forecast) {
    console.error('Finance forecast is required to calculate negative profit alert');
    return null;
  }

  const expectedProfitCents = forecast.expectedProfitCents;
  if (!Number.isFinite(expectedProfitCents)) {
    console.error('Finance forecast expectedProfitCents is invalid', { expectedProfitCents });
    return null;
  }

  if (expectedProfitCents >= 0) return null;

  return {
    actionHref: '/admin/finance#previsao-financeira',
    actionLabel: 'Ver previsão financeira',
    description: `A previsão atual aponta para um resultado de ${formatCurrencyCents(expectedProfitCents)} até ao fim do mês.`,
    id: 'forecast-negative-profit',
    metadata: { expectedProfitCents },
    severity: 'danger',
    title: 'Lucro previsto do mês está negativo',
  };
}
