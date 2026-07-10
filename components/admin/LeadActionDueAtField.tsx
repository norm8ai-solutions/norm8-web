'use client';

import * as React from 'react';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';

type LeadActionDueAtFieldProps = {
  actionError?: string;
  defaultValue: Date;
  label: string;
  messages: {
    required: string;
    past: string;
  };
};

/**
 * Client-side visual validation for the new lead-action due date field.
 * Server actions still perform the authoritative validation on submit.
 */
export function LeadActionDueAtField({
  actionError,
  defaultValue,
  label,
  messages,
}: LeadActionDueAtFieldProps) {
  const [fieldError, setFieldError] = React.useState<'dueAt' | 'dueAtPast' | undefined>(
    getInitialError(actionError, defaultValue),
  );

  const handleValueChange = (value: Date | null): void => {
    if (!value) {
      setFieldError('dueAt');
      return;
    }

    setFieldError(value < new Date() ? 'dueAtPast' : undefined);
  };

  const errorMessage =
    fieldError === 'dueAtPast'
      ? messages.past
      : fieldError === 'dueAt'
        ? messages.required
        : undefined;

  return (
    <label className="admin-form-control">
      <span>{label}</span>
      <Norm8DateTimePicker
        ariaRequired
        defaultValue={defaultValue}
        error={Boolean(errorMessage)}
        errorId="lead-action-due-at-error"
        name="dueAt"
        onValueChange={handleValueChange}
      />
      {errorMessage ? (
        <small className="admin-field-error" id="lead-action-due-at-error">
          {errorMessage}
        </small>
      ) : null}
    </label>
  );
}

function getInitialError(
  actionError: string | undefined,
  defaultValue: Date,
): 'dueAt' | 'dueAtPast' | undefined {
  if (actionError !== 'dueAt' && actionError !== 'dueAtPast') {
    return undefined;
  }

  if (actionError === 'dueAt') {
    return undefined;
  }

  return defaultValue < new Date() ? 'dueAtPast' : undefined;
}
