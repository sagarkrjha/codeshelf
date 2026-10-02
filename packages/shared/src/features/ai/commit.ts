import { executeSafeAiCall, DEFAULT_GEMINI_MODEL } from './client';

export interface AiGenerateCommitParams {
  currentCode: string;
  previousCode?: string;
  diffText?: string;
  language?: string;
  title?: string;
  apiKey: string;
  model?: string;
}

const COMMIT_SYSTEM_INSTRUCTION = `You are an expert Git version control assistant.
Your task is to generate a concise, conventional commit note (under 72 characters) summarizing changes made to a code snippet.
Use standard Conventional Commits prefixes:
- feat: for new features, algorithms, or capabilities
- fix: for bug fixes or edge case corrections
- refactor: for code restructuring, simplification, or cleanup
- perf: for performance, asymptotic complexity, or memory improvements
- docs: for documentation, comments, or explanation updates
- test: for test case additions or updates

Return ONLY the single-line commit message. Do NOT include quotes, markdown backticks, or extra explanation.`;

/**
 * Uses Gemini AI via @google/genai to generate a conventional commit message from code changes.
 */
export async function aiGenerateCommitMessage(params: AiGenerateCommitParams): Promise<string> {
  const { currentCode, previousCode, diffText, language, title, apiKey, model } = params;

  if (!currentCode && !diffText) {
    throw new Error('Current code or diff text must be provided to generate a commit message.');
  }

  let changeDescription = '';
  if (title) {
    changeDescription += `Snippet: ${title}\n`;
  }
  if (language) {
    changeDescription += `Language: ${language}\n`;
  }

  if (diffText && diffText.trim()) {
    changeDescription += `Diff / Changes:\n${diffText.trim()}\n`;
  } else if (previousCode !== undefined) {
    changeDescription += `Previous Code:\n\`\`\`\n${previousCode}\n\`\`\`\n\nCurrent Code:\n\`\`\`\n${currentCode}\n\`\`\`\n`;
  } else {
    changeDescription += `Current Code:\n\`\`\`\n${currentCode}\n\`\`\`\n`;
  }

  return executeSafeAiCall(apiKey, async (ai) => {
    const response = await ai.models.generateContent({
      model: model || DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: COMMIT_SYSTEM_INSTRUCTION },
            { text: changeDescription },
          ],
        },
      ],
      config: {
        temperature: 0.2,
      },
    });

    const responseText = response.text || '';
    const cleanMessage = responseText
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^["'`]|["'`]$/g, '')
      .trim();

    if (!cleanMessage) {
      throw new Error('Received empty commit message from Gemini AI.');
    }

    return cleanMessage;
  });
}
