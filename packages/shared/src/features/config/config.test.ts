import { test } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_CODESHELF_CONFIG,
  validateConfig,
  mergeConfig,
  CODESHELF_CONFIG_FILENAME,
  maskApiKey,
  sanitizeErrorMessage,
  isValidGeminiApiKeyFormat,
} from './config';


test('DEFAULT_CODESHELF_CONFIG provides sane defaults', () => {
  assert.strictEqual(CODESHELF_CONFIG_FILENAME, 'config.json');
  assert.strictEqual(DEFAULT_CODESHELF_CONFIG.theme, 'dark');
  assert.strictEqual(DEFAULT_CODESHELF_CONFIG.autoSync, true);
  assert.strictEqual(DEFAULT_CODESHELF_CONFIG.geminiModel, 'gemini-3.8-flash');
  assert.strictEqual(DEFAULT_CODESHELF_CONFIG.editor?.fontSize, 14);
  assert.strictEqual(DEFAULT_CODESHELF_CONFIG.defaultLanguage, 'typescript');
});

test('validateConfig handles empty or invalid inputs gracefully', () => {
  const result = validateConfig(null);
  assert.deepStrictEqual(result, DEFAULT_CODESHELF_CONFIG);

  const emptyResult = validateConfig({});
  assert.strictEqual(emptyResult.theme, 'dark');
  assert.strictEqual(emptyResult.editor?.tabSize, 2);
  assert.strictEqual(emptyResult.geminiModel, 'gemini-3.8-flash');

  const legacyModelResult = validateConfig({ geminiModel: 'gemini-2.5-flash' });
  assert.strictEqual(legacyModelResult.geminiModel, 'gemini-3.8-flash');

  const invalidTheme = validateConfig({ theme: 'neon' });
  assert.strictEqual(invalidTheme.theme, 'dark');
});

test('mergeConfig merges partial configuration and dedupes custom tags/technologies', () => {
  const base = {
    ...DEFAULT_CODESHELF_CONFIG,
    customTechnologies: ['React', 'Node'],
    customTags: ['frontend'],
  };

  const merged = mergeConfig(base, {
    theme: 'light',
    editor: { fontSize: 16 },
    customTechnologies: ['Node', 'Rust'],
    customTags: ['backend', 'frontend'],
  });

  assert.strictEqual(merged.theme, 'light');
  assert.strictEqual(merged.editor?.fontSize, 16);
  assert.strictEqual(merged.editor?.tabSize, 2);
  assert.deepStrictEqual(merged.customTechnologies, ['React', 'Node', 'Rust']);
  assert.deepStrictEqual(merged.customTags, ['frontend', 'backend']);
});

test('maskApiKey obfuscates API key safely for UI presentation', () => {
  assert.strictEqual(maskApiKey(''), '');

  assert.strictEqual(maskApiKey(undefined), '');
  assert.strictEqual(maskApiKey('short'), '••••••••');
  assert.strictEqual(maskApiKey('AIzaSy1234567890abcdef'), 'AIzaSy...cdef');

  const secret = 'AIzaSySecretApiKey12345';
  const err = `Failed to connect with key ${secret}: 403 Forbidden`;
  const sanitized = sanitizeErrorMessage(err, secret);
  assert.strictEqual(sanitized, 'Failed to connect with key [REDACTED_API_KEY]: 403 Forbidden');
  assert.strictEqual(sanitizeErrorMessage(err, ''), err);

  assert.strictEqual(isValidGeminiApiKeyFormat('AIzaSy1234567890abcdef'), true);
  assert.strictEqual(isValidGeminiApiKeyFormat('AIza1234567890abcdefghij'), true);
  assert.strictEqual(isValidGeminiApiKeyFormat('custom-key-12345'), true);
  assert.strictEqual(isValidGeminiApiKeyFormat('invalid key with spaces'), false);
  assert.strictEqual(isValidGeminiApiKeyFormat('short'), false);
  assert.strictEqual(isValidGeminiApiKeyFormat(''), false);
});

