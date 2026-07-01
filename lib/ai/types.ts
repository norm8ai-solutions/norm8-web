/**
 * ------------------------------------------------------------------
 * File: lib/ai/types.ts
 * Description: Shared AI provider configuration types for server-side integrations.
 * Responsibilities:
 * - Describe the runtime configuration used by internal AI services.
 * - Keep provider setup independent from feature-specific prompts.
 * ------------------------------------------------------------------
 */

export type GroqConfig = {
  apiKey: string;
  model: string;
};