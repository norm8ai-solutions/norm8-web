/**
 * ------------------------------------------------------------------
 * File: lib/admin/types.ts
 * Description: Shared types for Norm8 admin queries and actions.
 * Responsibilities:
 * - Define filter contracts used by admin pages.
 * - Keep query functions strongly typed and reusable.
 * - Prepare the admin area for future authentication replacement.
 * ------------------------------------------------------------------
 */

import type { LeadPriority, LeadStatus } from '@/app/generated/prisma/client';

export type LeadFilters = {
  search?: string;
  status?: LeadStatus | 'ALL';
  priority?: LeadPriority | 'ALL';
};

export type MeetingFilter = 'ALL' | 'CONFIRMED' | 'FAILED' | 'UPCOMING' | 'PAST';

export type EmailFilter = 'ALL' | 'PENDING' | 'SENT' | 'FAILED';

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
