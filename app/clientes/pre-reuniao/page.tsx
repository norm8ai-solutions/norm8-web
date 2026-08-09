import type { Metadata } from 'next';
import { PreMeetingIntakeForm } from '@/components/clientes/ManualClientIntakeForms';
import styles from '@/components/clientes/ManualClientIntake.module.css';
import { getPreMeetingInviteTokenState } from '@/lib/manual-client-intake/service';

export const metadata: Metadata = {
  title: 'Preparação pré-reunião | Norm8',
  robots: { index: false, follow: false },
};

type PreMeetingIntakePageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function PreMeetingIntakePage({ searchParams }: PreMeetingIntakePageProps) {
  const query = await searchParams;
  const invite = await getPreMeetingInviteTokenState(query?.token);

  return (
    <main className={styles.clientIntakePage}>
      <div className={styles.clientIntakeShell}>
        <header className={styles.clientIntakeHeader}>
          <p className={styles.clientIntakeEyebrow}>Norm8 · Pré-reunião</p>
          <h1 className={styles.clientIntakeTitle}>Preparação da reunião</h1>
          <p className={styles.clientIntakeIntro}>
            Partilhe o contexto da sua empresa para prepararmos uma reunião mais objetiva e útil.
          </p>
        </header>
        <PreMeetingIntakeForm invite={invite} />
      </div>
    </main>
  );
}
