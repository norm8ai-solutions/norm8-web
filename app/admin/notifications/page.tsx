/**
 * ------------------------------------------------------------------
 * File: app/admin/notifications/page.tsx
 * Description: Notifications page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Display internal Notification records.
 * - Filter by status.
 * - Allow marking notifications as read.
 * ------------------------------------------------------------------
 */

import { Check, Filter } from 'lucide-react';
import { Norm8Select } from '@/components/ui/norm8-select';
import { NotificationStatusBadge } from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminRow,
} from '@/components/admin/AdminPrimitives';
import type { NotificationFilter } from '@/lib/admin/types';
import { formatDatePt } from '@/lib/admin/formatters';
import { markNotificationAsRead } from '@/lib/admin/actions';
import { getNotifications } from '@/lib/admin/queries';

type AdminNotificationsPageProps = {
  searchParams?: Promise<{ status?: NotificationFilter }>;
};

const notificationFilters: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'UNREAD', label: 'Por ler' },
  { value: 'READ', label: 'Lidas' },
  { value: 'ARCHIVED', label: 'Arquivadas' },
];

/**
 * Renders notifications and read actions.
 *
 * @param props Search params with optional status filter.
 * @returns Notifications page.
 */
export default async function AdminNotificationsPage({
  searchParams,
}: AdminNotificationsPageProps) {
  const params = await searchParams;
  const status = params?.status ?? 'ALL';
  const notifications = await getNotifications(status);

  return (
    <div className="admin-page-grid">
      <AdminPanel title="Notificações" subtitle={`${notifications.length} alertas internos`}>
        <form action="/admin/notifications" className="admin-filters">
          <Norm8Select
            defaultValue={status}
            name="status"
            options={notificationFilters}
          />
          <button className="admin-filter-button" type="submit">
            <Filter size={14} />
            Filtrar
          </button>
        </form>
      </AdminPanel>

      <AdminPanel>
        {notifications.length > 0 ? (
          <div className="admin-row-list">
            {notifications.map((notification) => (
              <AdminRow
                key={notification.id}
                title={
                  <>
                    {notification.title} <NotificationStatusBadge status={notification.status} />
                  </>
                }
                meta={`${notification.type} · ${formatDatePt(notification.createdAt)}`}
              >
                <p className="admin-row-text">{notification.message}</p>
                {notification.status === 'UNREAD' && (
                  <form action={markNotificationAsRead}>
                    <input
                      name="notificationId"
                      type="hidden"
                      value={notification.id}
                    />
                    <button className="admin-button admin-button-muted" type="submit">
                      <Check size={14} />
                      Marcar como lida
                    </button>
                  </form>
                )}
              </AdminRow>
            ))}
          </div>
        ) : (
          <AdminEmptyState>Sem notificações para o filtro selecionado.</AdminEmptyState>
        )}
      </AdminPanel>
    </div>
  );
}
