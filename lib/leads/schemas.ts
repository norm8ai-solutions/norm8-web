/**
 * ------------------------------------------------------------------
 * File: lib/leads/schemas.ts
 * Description: Zod schemas for public Norm8 lead submission forms.
 * Responsibilities:
 * - Validate all inbound form data before database writes.
 * - Normalize emails, optional strings, URLs, and dates.
 * - Keep form-specific validation reusable by server actions and services.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

const requiredText = (fieldLabel: string) =>
  z.string().trim().min(1, `${fieldLabel} é obrigatório.`);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const emailSchema = z
  .string()
  .trim()
  .email('Insira um email válido.')
  .toLowerCase();

const websiteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.url('Insira um website válido.').optional());

/**
 * Validation schema for the Intelligent Audit request flow.
 */
export const auditRequestSchema = z.object({
  company: requiredText('Empresa'),
  website: websiteSchema,
  email: emailSchema,
  phone: optionalText,
  industry: requiredText('Setor de atividade'),
  employees: requiredText('Número de colaboradores'),
  annualRevenue: optionalText,
  toolsUsed: optionalText,
  mainChallenge: requiredText('Maior desafio operacional'),
  mainGoal: requiredText('Objetivo principal'),
});

/**
 * Validation schema for the custom automation request flow.
 */
export const customAutomationRequestSchema = z.object({
  name: requiredText('Nome'),
  company: requiredText('Empresa'),
  role: optionalText,
  email: emailSchema,
  phone: optionalText,
  website: websiteSchema,
  employees: optionalText,
  industry: optionalText,
  processToAutomate: requiredText('Processo a automatizar'),
  currentTools: optionalText,
  mainChallenge: requiredText('Principal desafio'),
  desiredOutcome: optionalText,
  estimatedBudget: optionalText,
  desiredTimeline: optionalText,
});

/**
 * Validation schema for meeting requests.
 */
export const meetingRequestSchema = z.object({
  name: requiredText('Nome'),
  company: requiredText('Empresa'),
  email: emailSchema,
  phone: optionalText,
  meetingGoal: optionalText,
  selectedDate: requiredText('Data'),
  selectedTime: requiredText('Hora'),
});

export type AuditRequestInput = z.infer<typeof auditRequestSchema>;
export type CustomAutomationRequestInput = z.infer<
  typeof customAutomationRequestSchema
>;
export type MeetingRequestInput = z.infer<typeof meetingRequestSchema>;
