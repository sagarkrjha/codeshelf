import { test } from 'node:test';
import assert from 'node:assert';
import {
  createGenAIClient,
  executeSafeAiCall,
  DEFAULT_GEMINI_MODEL,
} from './client';
import { aiAutofillFromCode } from './autofill';
import { aiGenerateCommitMessage } from './commit';

test('createGenAIClient validates apiKey', () => {
  assert.throws(() => {
    createGenAIClient('');
  }, /Gemini API key is required/);

  assert.throws(() => {
    createGenAIClient('   ');
  }, /Gemini API key is required/);

  const client = createGenAIClient('test-key');
  assert.ok(client);
  assert.strictEqual(typeof client.models.generateContent, 'function');
  assert.strictEqual(DEFAULT_GEMINI_MODEL, 'gemini-3.8-flash');
});

test('executeSafeAiCall redacts secret API key if error occurs', async () => {
  const secretKey = 'AIzaSyTopSecretKey987654321';
  let thrownError: Error | null = null;

  try {
    await executeSafeAiCall(secretKey, async () => {
      throw new Error(`Authentication failed with key: ${secretKey}`);
    });
  } catch (err: any) {
    thrownError = err;
  }

  assert.ok(thrownError);
  assert.ok(
    !thrownError.message.includes(secretKey),
    'Secret API key must not appear in error message'
  );
  assert.ok(
    thrownError.message.includes('[REDACTED_API_KEY]'),
    'Secret API key must be replaced with [REDACTED_API_KEY]'
  );
});

test('aiAutofillFromCode validates required inputs', async () => {
  await assert.rejects(
    async () => {
      await aiAutofillFromCode({
        code: '',
        apiKey: 'test-key',
      });
    },
    /Code snippet cannot be empty/
  );
});

test('aiGenerateCommitMessage validates required inputs', async () => {
  await assert.rejects(
    async () => {
      await aiGenerateCommitMessage({
        currentCode: '',
        diffText: '',
        apiKey: 'test-key',
      });
    },
    /Current code or diff text must be provided/
  );
});
