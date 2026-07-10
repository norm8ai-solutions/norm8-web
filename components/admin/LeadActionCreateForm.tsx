'use client';

import * as React from 'react';
import type { LeadActionType } from '@/app/generated/prisma/client';
import { LeadActionDueAtField } from '@/components/admin/LeadActionDueAtField';
import { Norm8Select } from '@/components/ui/norm8-select';
import { createLeadAction } from '@/lib/admin/actions';
import {
  type SuggestedLeadAction,
  getLeadActionPresetByType,
} from '@/lib/admin/lead-action-suggestions';
import { formatLeadActionType } from '@/lib/admin/formatters';

type LeadActionCreateFormProps = {
  actionError?: string;
  actionTypes: LeadActionType[];
  copy: {
    create: string;
    description: string;
    descriptionPlaceholder: string;
    dueAt: string;
    dueAtError: string;
    dueAtPastError: string;
    title: string;
    titleError: string;
    titlePlaceholder: string;
  };
  leadId: string;
  suggestedAction: SuggestedLeadAction;
};

/**
 * Controlled create form so changing action type refreshes title/description presets.
 */
export function LeadActionCreateForm({
  actionError,
  actionTypes,
  copy,
  leadId,
  suggestedAction,
}: LeadActionCreateFormProps) {
  const [selectedType, setSelectedType] = React.useState<LeadActionType>(
    suggestedAction.type,
  );
  const [title, setTitle] = React.useState<string>(suggestedAction.title);
  const [description, setDescription] = React.useState<string>(
    suggestedAction.description,
  );

  const handleTypeChange = (nextType: string): void => {
    const typedNextType = nextType as LeadActionType;
    const preset = getLeadActionPresetByType(typedNextType);

    setSelectedType(typedNextType);
    setTitle(preset.title);
    setDescription(preset.description);
  };

  return (
    <form action={createLeadAction} className="admin-action-form" noValidate>
      <input name="leadId" type="hidden" value={leadId} />
      <div className="admin-action-form-grid">
        <label className="admin-form-control">
          <span>{copy.title}</span>
          <input
            aria-describedby={actionError === 'title' ? 'lead-action-title-error' : undefined}
            aria-invalid={actionError === 'title' || undefined}
            className="admin-input"
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.titlePlaceholder}
            value={title}
          />
          {actionError === 'title' ? (
            <small className="admin-field-error" id="lead-action-title-error">
              {copy.titleError}
            </small>
          ) : null}
        </label>

        <label className="admin-form-control">
          <span>Tipo</span>
          <Norm8Select
            ariaRequired
            name="type"
            onValueChange={handleTypeChange}
            options={actionTypes.map((type) => ({
              value: type,
              label: formatLeadActionType(type),
            }))}
            value={selectedType}
          />
        </label>

        <LeadActionDueAtField
          actionError={actionError}
          defaultValue={suggestedAction.dueAt}
          label={copy.dueAt}
          messages={{
            required: copy.dueAtError,
            past: copy.dueAtPastError,
          }}
        />
      </div>

      <label className="admin-form-control">
        <span>{copy.description}</span>
        <textarea
          className="admin-textarea"
          name="description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder={copy.descriptionPlaceholder}
          value={description}
        />
      </label>

      <button className="admin-button" type="submit">
        {copy.create}
      </button>
    </form>
  );
}