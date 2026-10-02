import { executeSafeAiCall, DEFAULT_GEMINI_MODEL } from './client';

export interface AiAutofillParams {
  code: string;
  language?: string;
  apiKey: string;
  model?: string;
}

export interface AiAutofillComplexity {
  time?: string;
  space?: string;
}

/**
 * Universal Structured Explanation & Context.
 * Language/framework agnostic breakdown answering:
 * - What does this snippet do?
 * - Why does it exist or when should it be preferred?
 * - When to use it (triggers, contexts, conditions)?
 * - How does it work internally (mechanism, algorithmic steps)?
 */
export interface AiAutofillExplanation {
  what: string;
  why: string;
  when: string;
  how: string;
}

export interface AiAutofillResult {
  title: string;
  description: string;
  explanation?: AiAutofillExplanation;
  category: string;
  subcategory?: string;
  tags: string[];
  technology: string[];
  usage: string[];
  complexity?: AiAutofillComplexity;
}

const AGNOSTIC_AUTOFILL_PROMPT = `You are a universal, language-agnostic code analysis assistant.
Analyze the provided code snippet regardless of language, framework, or paradigm.
Return a clean, structured JSON object with the following fields:

- title: A clear, concise title for this snippet (e.g. "Binary Search Implementation", "JWT Authentication Middleware", "Reactive State Hook").
- description: A concise 1-2 sentence high-level summary of the snippet.
- explanation: A language/stack agnostic architectural breakdown with four distinct facets:
  - what: What this snippet actually accomplishes and the core problem it solves.
  - why: Why this pattern/technique exists and why a developer should choose it over naive alternatives.
  - when: When to apply this snippet (specific triggers, architecture contexts, use cases, or conditions).
  - how: How the implementation works mechanically (key steps, control flow, invariants, or algorithms).
- category: A primary domain category (e.g. "Algorithms", "Data Structures", "Frontend", "Backend", "Database", "DevOps", "Security", "Utilities").
- subcategory: A specific subcategory (e.g. "Searching", "Hooks", "Middleware", "Caching", "Concurrency", "Serialization").
- tags: Array of 3-6 relevant lowercase keyword tags (e.g. ["binary-search", "recursion", "array", "logarithmic"]).
- technology: Array of technologies, libraries, or runtimes (e.g. ["TypeScript", "React", "Node", "Go", "Python"]).
- usage: Array of 2-4 practical usage context bullet points explaining where and how to integrate it.
- complexity: An object with "time" (e.g. "O(log n)") and "space" (e.g. "O(1)") asymptotic complexities, if applicable.

Return ONLY valid JSON matching this schema without markdown fences or backticks.`;

/**
 * Uses Gemini AI to automatically analyze any code snippet in a language-agnostic way,
 * extracting title, category, tags, technology, complexity, usage guidelines,
 * and a deep "What / Why / When / How" explanation.
 */
export async function aiAutofillFromCode(params: AiAutofillParams): Promise<AiAutofillResult> {
  const { code, language, apiKey, model } = params;

  if (!code || !code.trim()) {
    throw new Error('Code snippet cannot be empty for AI autofill.');
  }

  return executeSafeAiCall(apiKey, async (ai) => {
    const userPrompt = `Language: ${language || 'Auto-detect'}\n\nCode:\n\`\`\`${language || ''}\n${code}\n\`\`\``;

    const response = await ai.models.generateContent({
      model: model || DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: AGNOSTIC_AUTOFILL_PROMPT },
            { text: userPrompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '';
    if (!responseText.trim()) {
      throw new Error('Received empty response from Gemini AI.');
    }

    try {
      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Parse What/Why/When/How explanation safely
      let explanation: AiAutofillExplanation | undefined = undefined;
      if (parsed.explanation && typeof parsed.explanation === 'object') {
        const rawExp = parsed.explanation as Record<string, unknown>;
        const what = typeof rawExp.what === 'string' ? rawExp.what.trim() : '';
        const why = typeof rawExp.why === 'string' ? rawExp.why.trim() : '';
        const when = typeof rawExp.when === 'string' ? rawExp.when.trim() : '';
        const how = typeof rawExp.how === 'string' ? rawExp.how.trim() : '';

        if (what || why || when || how) {
          explanation = { what, why, when, how };
        }
      }

      // Format usage contexts
      const usageList: string[] = [];
      if (Array.isArray(parsed.usage)) {
        for (const item of parsed.usage) {
          if (typeof item === 'string' && item.trim()) {
            usageList.push(item.trim());
          }
        }
      }

      return {
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Code Snippet',
        description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
        explanation,
        category: typeof parsed.category === 'string' && parsed.category.trim() ? parsed.category.trim() : 'Utilities',
        subcategory: typeof parsed.subcategory === 'string' && parsed.subcategory.trim() ? parsed.subcategory.trim() : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean) : [],
        technology: Array.isArray(parsed.technology) ? parsed.technology.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
        usage: usageList,


        complexity: parsed.complexity && typeof parsed.complexity === 'object'
          ? {
              time: typeof parsed.complexity.time === 'string' ? parsed.complexity.time.trim() : undefined,
              space: typeof parsed.complexity.space === 'string' ? parsed.complexity.space.trim() : undefined,
            }
          : undefined,
      };
    } catch {
      throw new Error(`Failed to parse AI autofill response as JSON: ${responseText.slice(0, 100)}...`);
    }
  });
}
