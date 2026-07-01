/**
 * ------------------------------------------------------------------
 * File: lib/ai/groq.ts
 * Description: Server-only Groq client factory for Norm8 AI workflows.
 * Responsibilities:
 * - Read Groq configuration from environment variables.
 * - Validate that required configuration exists before API calls.
 * - Expose a configured client without leaking secrets to the frontend.
 * ------------------------------------------------------------------
 */

import 'server-only';

import Groq from 'groq-sdk';
import type { GroqConfig } from './types';

const DEFAULT_GROQ_MODEL = 'llama-3.1-70b-versatile';

/**
 * Loads and validates Groq configuration from environment variables.
 *
 * @returns Groq API key and selected model.
 * @throws Error when GROQ_API_KEY is missing.
 */
export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  return {
    apiKey,
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
  };
}

/**
 * Creates a server-side Groq client using validated configuration.
 *
 * @returns Groq client and model name.
 */
export function createGroqClient(): { client: Groq; model: string } {
  const config = getGroqConfig();

  return {
    client: new Groq({ apiKey: config.apiKey }),
    model: config.model,
  };
}