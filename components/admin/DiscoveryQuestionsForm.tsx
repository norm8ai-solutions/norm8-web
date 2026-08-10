/**
 * ------------------------------------------------------------------
 * File: components/admin/DiscoveryQuestionsForm.tsx
 * Description: Actionable Discovery question cards for Base Offer workspaces.
 * Responsibilities:
 * - Render structured Discovery questions with editable category and answers.
 * - Calculate answered/unanswered state in the client while typing.
 * - Contribute structured response fields to the Discovery workspace form.
 * ------------------------------------------------------------------
 */

'use client';

import { useState } from 'react';
import { Norm8Select } from '@/components/ui/norm8-select';
import {
  discoveryQuestionCategoryOptions,
  getDiscoveryQuestionCategoryLabel,
  type DiscoveryQuestionCategory,
  type DiscoveryQuestionInput,
} from '@/lib/admin/discovery-types';

type DiscoveryQuestionsFormProps = {
  questions: DiscoveryQuestionInput[];
};

/**
 * Renders actionable Discovery questions inside the shared workspace save form.
 *
 * @param props Normalized Discovery questions.
 * @returns Discovery questions fields.
 */
export function DiscoveryQuestionsForm({ questions }: DiscoveryQuestionsFormProps) {
  const [drafts, setDrafts] = useState(questions);

  const updateDraft = (index: number, patch: Partial<DiscoveryQuestionInput>): void => {
    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="discovery-question-form">
      <input name="questionCount" type="hidden" value={drafts.length} />

      <div className="discovery-question-list">
        {drafts.map((question, index) => {
          const answered = question.answer.trim().length > 0;

          return (
            <article className="discovery-question-card discovery-question-card-actionable" key={question.id}>
              <input name={`questionId-${index}`} type="hidden" value={question.id} />
              <input name={`question-${index}`} type="hidden" value={question.question} />

              <div className="discovery-question-main">
                <div className="discovery-question-card-header">
                  <span className={answered ? 'admin-badge admin-badge-green' : 'admin-badge admin-badge-slate'}>
                    {answered ? 'Respondida' : 'Por responder'}
                  </span>
                  <span className="admin-badge">{getCategoryLabel(question.category)}</span>
                </div>
                <p>{question.question}</p>
              </div>

              <div className="discovery-question-fields">
                <label className="manual-intake-admin-field">
                  <span>Categoria</span>
                  <Norm8Select
                    buttonClassName="admin-select"
                    name={`category-${index}`}
                    onValueChange={(value) => updateDraft(index, { category: value as DiscoveryQuestionCategory })}
                    options={discoveryQuestionCategoryOptions}
                    value={question.category}
                  />
                </label>
                <label className="manual-intake-admin-field">
                  <span>Resposta durante a reunião</span>
                  <textarea
                    className="admin-textarea discovery-question-textarea"
                    name={`answer-${index}`}
                    onChange={(event) => updateDraft(index, { answer: event.target.value })}
                    value={question.answer}
                  />
                </label>
                <label className="manual-intake-admin-field">
                  <span>Impacto ou observação</span>
                  <textarea
                    className="admin-textarea discovery-question-textarea discovery-question-textarea-small"
                    name={`impactOrObservation-${index}`}
                    onChange={(event) => updateDraft(index, { impactOrObservation: event.target.value })}
                    value={question.impactOrObservation ?? ''}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getCategoryLabel(category: DiscoveryQuestionCategory): string {
  return getDiscoveryQuestionCategoryLabel(category);
}