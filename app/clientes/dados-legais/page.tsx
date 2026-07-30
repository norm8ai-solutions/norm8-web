import type { Metadata } from 'next';
import { LegalDataIntakeForm } from '@/components/clientes/ManualClientIntakeForms';
import styles from '@/components/clientes/ManualClientIntake.module.css';

export const metadata: Metadata = {
  title: 'Dados legais | Norm8',
  robots: { index: false, follow: false },
};

type LegalDataPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function LegalDataIntakePage({ searchParams }: LegalDataPageProps) {
  const query = await searchParams;

  return (
    <main className={styles.clientIntakePage}>
      <div className={styles.clientIntakeShell}>
        <header className={styles.clientIntakeHeader}>
          <p className={styles.clientIntakeEyebrow}>Norm8 · Dados legais</p>
          <h1 className={styles.clientIntakeTitle}>Dados para proposta e contrato</h1>
          <p className={styles.clientIntakeIntro}>
            Envie apenas dados legais, de faturação e contactos relevantes para os próximos passos. Não envie passwords, credenciais, chaves API ou acessos técnicos por este formulário.
          </p>
        </header>
        <LegalDataIntakeForm token={query?.token} />
      </div>
    </main>
  );
}