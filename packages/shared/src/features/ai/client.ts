import { GoogleGenAI } from '@google/genai';
import { sanitizeErrorMessage } from '../config';

/**
 * Supported modern Gemini model identifiers:
 * - gemini-3.8-flash (Google's latest generation model for speed, code, and agentic workflows)
 * - gemini-3.5-flash (High-efficiency alternative)
 * - gemini-3.5-flash-lite (Ultra lightweight)
 */
export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest & Recommended)', isDefault: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
] as const;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Creates an instance of GoogleGenAI client with error handling.
 */
export function createGenAIClient(apiKey: string): GoogleGenAI {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is required. Please set it in CodeShelf configuration.');
  }

  return new GoogleGenAI({ apiKey: cleanKey });
}

/**
 * Executes a Gemini AI call while ensuring the user's secret API key is never exposed
 * in any error messages, logs, or stack traces.
 */
export async function executeSafeAiCall<T>(
  apiKey: string,
  fn: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const client = createGenAIClient(apiKey);
  try {
    return await fn(client);
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const safeMessage = sanitizeErrorMessage(rawMessage, apiKey);
    const sanitizedError = new Error(`Gemini AI Error: ${safeMessage}`);
    if (err instanceof Error && err.stack) {
      sanitizedError.stack = sanitizeErrorMessage(err.stack, apiKey);
    }
    throw sanitizedError;
  }
}
