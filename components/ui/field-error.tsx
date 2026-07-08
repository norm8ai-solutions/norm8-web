'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

type FieldErrorProps = {
  id: string;
  message?: string;
};

/**
 * Inline field-level validation message styled for the Norm8 dark UI.
 */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <motion.p
      animate={{ opacity: 1, y: 0 }}
      id={id}
      initial={{ opacity: 0, y: -4 }}
      role="alert"
      style={{
        alignItems: 'center',
        color: '#fca5a5',
        display: 'flex',
        fontSize: 12,
        gap: 6,
        lineHeight: 1.5,
        margin: '8px 0 0',
      }}
      transition={{ duration: 0.16 }}
    >
      <AlertCircle aria-hidden="true" size={14} />
      {message}
    </motion.p>
  );
}
