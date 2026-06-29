import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const isIframe: boolean = (() => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();