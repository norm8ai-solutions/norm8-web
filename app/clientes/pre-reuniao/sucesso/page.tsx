import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/components/clientes/ManualClientIntake.module.css';

export const metadata: Metadata = {
  title: 'Informações recebidas | Norm8',
  robots: { index: false, follow: false },
};

export default function PreMeetingIntakeSuccessPage() {
  return (
    <main className={styles.clientIntakePage}>
      <div className={styles.clientIntakeShell}>
        <section className={styles.clientIntakeSuccessCard} aria-labelledby="pre-meeting-success-title">
          <div className={styles.clientIntakeSuccessMark} aria-hidden="true">
            <span />
          </div>
          <p className={styles.clientIntakeEyebrow}>Norm8 · Pré-reunião</p>
          <h1 className={styles.clientIntakeSuccessTitle} id="pre-meeting-success-title">
            Informações recebidas com sucesso
          </h1>
          <p className={styles.clientIntakeSuccessText}>
            Obrigado. A equipa Norm8 recebeu o contexto partilhado e vai preparar a reunião
            com base nas informações enviadas.
          </p>
          <p className={styles.clientIntakeSuccessSecondary}>
            O próximo passo será a confirmação da reunião por email, com base na data discutida anteriormente.
          </p>
          <Link className={styles.clientIntakeSuccessButton} href="/">
            Voltar ao site
          </Link>
        </section>
      </div>
    </main>
  );
}