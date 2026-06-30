/**
 * ------------------------------------------------------------------
 * File: app/admin/login/page.tsx
 * Description: Temporary access page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Accept the ADMIN_ACCESS_KEY while auth is not implemented.
 * - Store access through a server action and httpOnly cookie.
 * - Keep the route replaceable by Clerk/Auth later.
 * ------------------------------------------------------------------
 */

import { ArrowRight, ShieldCheck } from 'lucide-react';
import AdminLogo from '@/components/admin/AdminLogo';
import { loginAdmin } from '@/lib/admin/actions';

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

/**
 * Renders the temporary admin login form.
 *
 * @param props Search params with optional error flag.
 * @returns Login page.
 */
export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;

  return (
    <div className="admin-login-page">
      <section className="admin-login-card">
        <AdminLogo caption="Área interna" />
        <h2 className="admin-login-title">Acesso Admin</h2>
        <p className="admin-login-copy">
          Área interna Norm8 para operação de leads, submissões, reuniões e emails.
        </p>

        <form action={loginAdmin} style={{ display: 'grid', gap: 14, marginTop: 24 }}>
          <input
            className="admin-input"
            name="key"
            placeholder="Código de acesso"
            type="password"
          />
          {params?.error && (
            <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>
              Código inválido.
            </p>
          )}
          <button className="admin-button" type="submit">
            <ShieldCheck size={15} />
            Entrar
            <ArrowRight size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}
