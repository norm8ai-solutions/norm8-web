/**
 * ------------------------------------------------------------------
 * File: app/admin/login/page.tsx
 * Description: Secure sign-in page for the Norm8 Admin dashboard.
 * Responsibilities:
 * - Ask for admin email and password.
 * - Redirect already authenticated admins away from login.
 * - Keep error messages generic and aligned with Norm8 branding.
 * ------------------------------------------------------------------
 */

import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AdminLogo from '@/components/admin/AdminLogo';
import {
  ADMIN_LOGIN_ERROR_MESSAGE,
  ADMIN_LOGIN_UNAVAILABLE_MESSAGE,
  getCurrentAdmin,
  sanitizeAdminRedirect,
} from '@/lib/admin/auth';

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Renders the secure admin login form.
 *
 * @param props Search params with optional error and safe next route.
 * @returns Login page.
 */
export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const next = sanitizeAdminRedirect(params?.next);
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect(next);
  }

  return (
    <div className="admin-shell">
      <div className="admin-login-page">
        <section className="admin-login-card">
          <AdminLogo caption="Área interna" />
          <p className="admin-topbar-eyebrow" style={{ marginTop: 24 }}>
            NORM8 ADMIN
          </p>
          <h1 className="admin-login-title">Área Interna</h1>
          <p className="admin-login-copy">
            Acesso seguro à operação comercial da Norm8: leads, reuniões, emails,
            propostas e auditorias inteligentes.
          </p>

          <AdminLoginForm
            error={
              params?.error === 'unavailable'
                ? ADMIN_LOGIN_UNAVAILABLE_MESSAGE
                : params?.error
                  ? ADMIN_LOGIN_ERROR_MESSAGE
                  : undefined
            }
            next={next}
          />

          <p className="admin-login-footnote">
            Usa apenas uma conta autorizada. As tentativas de acesso são registadas por segurança.
          </p>
        </section>
      </div>
    </div>
  );
}
