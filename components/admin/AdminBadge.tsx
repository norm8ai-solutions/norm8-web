/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminBadge.tsx
 * Description: Status and type badge component for the Norm8 admin UI.
 * Responsibilities:
 * - Convert operational states into consistent badge colors.
 * - Keep enum presentation centralized across tables and detail pages.
 * - Support future dashboard entities without changing page structure.
 * ------------------------------------------------------------------
 */

import type {
  EmailStatus,
  LeadActionStatus,
  LeadActionType,
  LeadPriority,
  LeadStatus,
  MeetingBookingStatus,
  NotificationStatus,
  SubmissionStatus,
  SubmissionType,
} from '@/app/generated/prisma/client';
import {
  formatLeadActionStatus,
  formatLeadActionType,
  formatLeadStatus,
  formatMeetingStatus,
  formatNotificationStatus,
  formatPriority,
  formatSubmissionStatus,
  formatSubmissionType,
} from '@/lib/admin/formatters';

type BadgeTone = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate' | 'cyan';

type AdminBadgeProps = {
  children: string;
  tone?: BadgeTone;
};

/**
 * Renders a compact pill used to communicate state in dense admin surfaces.
 *
 * @param props Badge text and optional visual tone.
 * @returns Styled badge element.
 */
export function AdminBadge({ children, tone = 'slate' }: AdminBadgeProps) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}


/**
 * Renders a commercial action status badge.
 *
 * @param props Lead action status value.
 * @returns Lead action status badge.
 */
export function LeadActionStatusBadge({ status }: { status: LeadActionStatus }) {
  const toneByStatus: Record<LeadActionStatus, BadgeTone> = {
    PENDING: 'yellow',
    IN_PROGRESS: 'blue',
    COMPLETED: 'green',
    OVERDUE: 'red',
  };

  return (
    <AdminBadge tone={toneByStatus[status]}>
      {formatLeadActionStatus(status)}
    </AdminBadge>
  );
}

/**
 * Renders a commercial action type badge.
 *
 * @param props Lead action type value.
 * @returns Lead action type badge.
 */
export function LeadActionTypeBadge({ type }: { type: LeadActionType }) {
  const toneByType: Record<LeadActionType, BadgeTone> = {
    CALL: 'cyan',
    SEND_EMAIL: 'blue',
    SCHEDULE_MEETING: 'purple',
    REVIEW_AUDIT: 'yellow',
    SEND_PROPOSAL: 'green',
    FOLLOW_UP: 'blue',
    CLOSE_LOST: 'red',
    OTHER: 'slate',
  };

  return <AdminBadge tone={toneByType[type]}>{formatLeadActionType(type)}</AdminBadge>;
}
/**
 * Renders a lead status badge.
 *
 * @param props Lead status value.
 * @returns Status badge with Portuguese label.
 */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const toneByStatus: Record<LeadStatus, BadgeTone> = {
    NEW: 'blue',
    QUALIFIED: 'cyan',
    CONTACTED: 'yellow',
    CONVERTED: 'green',
    LOST: 'red',
  };

  return <AdminBadge tone={toneByStatus[status]}>{formatLeadStatus(status)}</AdminBadge>;
}

/**
 * Renders a lead priority badge.
 *
 * @param props Lead priority value.
 * @returns Priority badge with Portuguese label.
 */
export function LeadPriorityBadge({ priority }: { priority: LeadPriority }) {
  const toneByPriority: Record<LeadPriority, BadgeTone> = {
    LOW: 'slate',
    MEDIUM: 'blue',
    HIGH: 'yellow',
    URGENT: 'red',
  };

  return <AdminBadge tone={toneByPriority[priority]}>{formatPriority(priority)}</AdminBadge>;
}

/**
 * Renders a submission status badge.
 *
 * @param props Submission status value.
 * @returns Submission status badge.
 */
export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const toneByStatus: Record<SubmissionStatus, BadgeTone> = {
    NEW: 'blue',
    IN_REVIEW: 'yellow',
    CONTACTED: 'cyan',
    CLOSED: 'green',
    ARCHIVED: 'slate',
  };

  return (
    <AdminBadge tone={toneByStatus[status]}>{formatSubmissionStatus(status)}</AdminBadge>
  );
}

/**
 * Renders a submission type badge.
 *
 * @param props Submission type value.
 * @returns Submission type badge.
 */
export function SubmissionTypeBadge({ type }: { type: SubmissionType }) {
  const toneByType: Record<SubmissionType, BadgeTone> = {
    AUDIT_REQUEST: 'blue',
    CUSTOM_AUTOMATION_REQUEST: 'purple',
    MEETING_REQUEST: 'cyan',
    PRE_MEETING_INTAKE: 'blue',
    LEGAL_DATA_INTAKE: 'green',
  };

  return <AdminBadge tone={toneByType[type]}>{formatSubmissionType(type)}</AdminBadge>;
}

/**
 * Renders a meeting status badge.
 *
 * @param props Meeting booking status value.
 * @returns Meeting status badge.
 */
export function MeetingStatusBadge({ status }: { status: MeetingBookingStatus }) {
  const toneByStatus: Record<MeetingBookingStatus, BadgeTone> = {
    REQUESTED: 'yellow',
    CONFIRMED: 'green',
    CANCELLED: 'slate',
    FAILED: 'red',
  };

  return <AdminBadge tone={toneByStatus[status]}>{formatMeetingStatus(status)}</AdminBadge>;
}

/**
 * Renders an email delivery status badge.
 *
 * @param props Email status value.
 * @returns Email status badge.
 */
export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const toneByStatus: Record<EmailStatus, BadgeTone> = {
    PENDING: 'yellow',
    SENT: 'green',
    FAILED: 'red',
  };
  const labels: Record<EmailStatus, string> = {
    PENDING: 'Pendente',
    SENT: 'Enviado',
    FAILED: 'Falhou',
  };

  return <AdminBadge tone={toneByStatus[status]}>{labels[status]}</AdminBadge>;
}

/**
 * Renders an internal notification status badge.
 *
 * @param props Notification status value.
 * @returns Notification status badge.
 */
export function NotificationStatusBadge({
  status,
}: {
  status: NotificationStatus;
}) {
  const toneByStatus: Record<NotificationStatus, BadgeTone> = {
    UNREAD: 'blue',
    READ: 'green',
    ARCHIVED: 'slate',
  };

  return (
    <AdminBadge tone={toneByStatus[status]}>
      {formatNotificationStatus(status)}
    </AdminBadge>
  );
}
