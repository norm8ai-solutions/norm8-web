'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type BackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> & {
  children?: ReactNode;
  fallbackHref?: string;
};

export function BackButton({
  children = 'Voltar atrás',
  fallbackHref = '/',
  ...props
}: BackButtonProps) {
  return (
    <button
      {...props}
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }

        window.location.assign(fallbackHref);
      }}
    >
      {children}
    </button>
  );
}