/**
 * ------------------------------------------------------------------
 * File: app/api/admin/search/route.ts
 * Description: Admin global search endpoint for the internal command bar.
 * Responsibilities:
 * - Validate the search query.
 * - Delegate real data lookup to the admin search service.
 * - Return a small JSON payload for the client topbar component.
 * ------------------------------------------------------------------
 */

import { NextResponse } from 'next/server';
import { searchAdminGlobal } from '@/lib/admin/global-search';
import type { AdminGlobalSearchResponse } from '@/lib/admin/search-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();

  if (query.length < 2) {
    return NextResponse.json<AdminGlobalSearchResponse>({
      query,
      results: [],
    });
  }

  const results = await searchAdminGlobal(query);

  return NextResponse.json<AdminGlobalSearchResponse>({
    query,
    results,
  });
}
