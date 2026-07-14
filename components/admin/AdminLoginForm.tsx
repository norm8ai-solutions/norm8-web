/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminLoginForm.tsx
 * Description: Client login form for the secure Norm8 Admin sign-in page.
 * Responsibilities:
 * - Submit credentials to the server action.
 * - Provide show/hide password UX and pending state.
 * - Keep error copy generic to avoid account enumeration.
 * ------------------------------------------------------------------
 */

'use client';

import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAdmin } from '@/lib/admin/actions';

type AdminLoginFormProps = {
  error?: string;
  next: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button" disabled={pending} type="submit">
      <ShieldCheck size={15} />
      {pending ? 'A validar...' : 'Entrar'}
    </button>
  );
}

export default function AdminLoginForm({ error, next }: AdminLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={loginAdmin} className="admin-login-form">
      <input name="next" type="hidden" value={next} />

      <label className="admin-login-field">
        <span>Email</span>
        <input
          autoComplete="email"
          className="admin-input"
          name="email"
          placeholder="admin@norm8.pt"
          required
          type="email"
        />
      </label>

      <label className="admin-login-field">
        <span>Palavra-passe</span>
        <div className="admin-password-field">
          <input
            autoComplete="current-password"
            className="admin-input"
            name="password"
            placeholder="A tua palavra-passe"
            required
            type={showPassword ? 'text' : 'password'}
          />
          <button
            aria-label={showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
            className="admin-password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </label>

      {error && <p className="admin-login-error">{error}</p>}

      <SubmitButton />
    </form>
  );
}
