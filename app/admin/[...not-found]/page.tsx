import { headers } from 'next/headers';
import { AdminNotFoundContent } from '@/components/not-found/AdminNotFoundContent';

export default async function AdminCatchAllNotFoundPage() {
  const headerStore = await headers();
  const pathname = headerStore.get('x-norm8-pathname') ?? '';

  return <AdminNotFoundContent pathname={pathname} />;
}