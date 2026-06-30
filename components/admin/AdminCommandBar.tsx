/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminCommandBar.tsx
 * Description: Visual command/search entry point for the Norm8 admin area.
 * Responsibilities:
 * - Provide a premium search affordance in the admin topbar.
 * - Prepare the interface for a future command palette implementation.
 * - Avoid introducing data-fetching behavior before the search contract exists.
 * ------------------------------------------------------------------
 */

import { Search } from 'lucide-react';

/**
 * Renders a non-invasive command bar shell for future global admin search.
 *
 * @returns Command bar button-like search field.
 */
export default function AdminCommandBar() {
  return (
    <button className="admin-command-bar" type="button">
      <Search size={15} />
      <span>Pesquisar leads, reuniões, empresas...</span>
      <kbd>⌘K</kbd>
    </button>
  );
}
