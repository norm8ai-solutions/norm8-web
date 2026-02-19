import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}

// SSR-safe iframe check
export const isIframe = () => {
  if (typeof window === "undefined") return false
  return window.self !== window.top
}