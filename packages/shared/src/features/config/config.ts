export interface CodeShelfEditorConfig {
  fontSize?: number;
  tabSize?: number;
  fontFamily?: string;
  wordWrap?: boolean;
}

export interface CodeShelfPermissionsConfig {
  fileSystemAccess?: 'granted' | 'prompt' | 'denied';
  directoryName?: string;
  directoryPath?: string;
  autoSyncFileSystem?: boolean;
  lastGrantedAt?: string;
}

export interface CodeShelfConfig {
  version: number;
  storagePath?: string;
  theme?: 'dark' | 'light' | 'system';
  autoSync?: boolean;
  syncIntervalMs?: number;
  geminiApiKey?: string;
  geminiModel?: string;
  editor?: CodeShelfEditorConfig;
  defaultLanguage?: string;
  defaultCategory?: string;
  customTechnologies?: string[];
  customCategories?: string[];
  customTags?: string[];
  permissions?: CodeShelfPermissionsConfig;
}

export const CODESHELF_CONFIG_FILENAME = 'config.json';

export const DEFAULT_CODESHELF_CONFIG: CodeShelfConfig = {
  version: 1,
  theme: 'dark',
  autoSync: true,
  syncIntervalMs: 5000,
  geminiModel: 'gemini-3.8-flash',
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
  },
  defaultLanguage: 'typescript',
  defaultCategory: 'General',
  customTechnologies: [],
  customCategories: [],
  customTags: [],
  permissions: {
    fileSystemAccess: 'granted',
    directoryName: '.codeshelf',
    autoSyncFileSystem: true,
  },
};

/**
 * Returns a masked representation of an API key for safe UI display (e.g. AIzaSy...4xyz).
 */
export function maskApiKey(apiKey?: string): string {
  if (!apiKey || typeof apiKey !== 'string') return '';
  const clean = apiKey.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Sanitizes any error message or string by replacing occurrences of the secret API key with [REDACTED_API_KEY].
 */
export function sanitizeErrorMessage(message: string, apiKey?: string): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return message;
  }
  return message.split(apiKey.trim()).join('[REDACTED_API_KEY]');
}

/**
 * Checks if a string has a plausibly valid Gemini API key format.
 * Typically 39 characters starting with "AIzaSy", but accepts any valid non-empty key token (>= 8 chars).
 */
export function isValidGeminiApiKeyFormat(apiKey?: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const clean = apiKey.trim();
  // Valid keys must not contain spaces or newlines and have minimal reasonable token length
  return clean.length >= 8 && !/\s/.test(clean);
}

/**
 * Validates and normalizes unknown input into a valid CodeShelfConfig,
 * falling back to default values for any missing or invalid fields.
 */
export function validateConfig(input: unknown): CodeShelfConfig {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_CODESHELF_CONFIG };
  }

  const raw = input as Record<string, unknown>;

  const theme: 'dark' | 'light' | 'system' =
    raw.theme === 'light' || raw.theme === 'system' || raw.theme === 'dark'
      ? raw.theme
      : DEFAULT_CODESHELF_CONFIG.theme!;

  const editorRaw = (raw.editor && typeof raw.editor === 'object' ? raw.editor : {}) as Record<string, unknown>;
  const editor: CodeShelfEditorConfig = {
    fontSize: typeof editorRaw.fontSize === 'number' && editorRaw.fontSize > 0
      ? editorRaw.fontSize
      : DEFAULT_CODESHELF_CONFIG.editor?.fontSize,
    tabSize: typeof editorRaw.tabSize === 'number' && editorRaw.tabSize > 0
      ? editorRaw.tabSize
      : DEFAULT_CODESHELF_CONFIG.editor?.tabSize,
    fontFamily: typeof editorRaw.fontFamily === 'string' && editorRaw.fontFamily.trim().length > 0
      ? editorRaw.fontFamily.trim()
      : undefined,
    wordWrap: typeof editorRaw.wordWrap === 'boolean'
      ? editorRaw.wordWrap
      : DEFAULT_CODESHELF_CONFIG.editor?.wordWrap,
  };

  const toStringArray = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  };

  const geminiApiKey =
    typeof raw.geminiApiKey === 'string' && raw.geminiApiKey.trim().length > 0
      ? raw.geminiApiKey.trim()
      : undefined;

  const rawModel =
    typeof raw.geminiModel === 'string' && raw.geminiModel.trim().length > 0
      ? raw.geminiModel.trim()
      : DEFAULT_CODESHELF_CONFIG.geminiModel;

  // Auto-upgrade legacy/deprecated models to gemini-3.8-flash
  const geminiModel =
    rawModel === 'gemini-2.5-flash' || rawModel === 'gemini-2.5-pro' || rawModel === 'gemini-2.0-flash'
      ? 'gemini-3.8-flash'
      : rawModel;

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    storagePath: typeof raw.storagePath === 'string' && raw.storagePath.trim().length > 0
      ? raw.storagePath.trim()
      : undefined,
    theme,
    autoSync: typeof raw.autoSync === 'boolean' ? raw.autoSync : DEFAULT_CODESHELF_CONFIG.autoSync,
    syncIntervalMs: typeof raw.syncIntervalMs === 'number' && raw.syncIntervalMs >= 1000
      ? raw.syncIntervalMs
      : DEFAULT_CODESHELF_CONFIG.syncIntervalMs,
    geminiApiKey,
    geminiModel,
    editor,
    defaultLanguage: typeof raw.defaultLanguage === 'string' && raw.defaultLanguage.trim().length > 0
      ? raw.defaultLanguage.trim()
      : DEFAULT_CODESHELF_CONFIG.defaultLanguage,
    defaultCategory: typeof raw.defaultCategory === 'string' && raw.defaultCategory.trim().length > 0
      ? raw.defaultCategory.trim()
      : DEFAULT_CODESHELF_CONFIG.defaultCategory,
    customTechnologies: toStringArray(raw.customTechnologies),
    customCategories: toStringArray(raw.customCategories),
    customTags: toStringArray(raw.customTags),
    permissions: raw.permissions && typeof raw.permissions === 'object'
      ? {
          fileSystemAccess:
            (raw.permissions as any).fileSystemAccess === 'granted' ||
            (raw.permissions as any).fileSystemAccess === 'prompt' ||
            (raw.permissions as any).fileSystemAccess === 'denied'
              ? (raw.permissions as any).fileSystemAccess
              : DEFAULT_CODESHELF_CONFIG.permissions?.fileSystemAccess,
          directoryName:
            typeof (raw.permissions as any).directoryName === 'string' && (raw.permissions as any).directoryName.trim().length > 0
              ? (raw.permissions as any).directoryName.trim()
              : DEFAULT_CODESHELF_CONFIG.permissions?.directoryName,
          directoryPath:
            typeof (raw.permissions as any).directoryPath === 'string' && (raw.permissions as any).directoryPath.trim().length > 0
              ? (raw.permissions as any).directoryPath.trim()
              : undefined,
          autoSyncFileSystem:
            typeof (raw.permissions as any).autoSyncFileSystem === 'boolean'
              ? (raw.permissions as any).autoSyncFileSystem
              : true,
          lastGrantedAt:
            typeof (raw.permissions as any).lastGrantedAt === 'string' && (raw.permissions as any).lastGrantedAt.trim().length > 0
              ? (raw.permissions as any).lastGrantedAt.trim()
              : undefined,
        }
      : DEFAULT_CODESHELF_CONFIG.permissions,
  };
}

/**
 * Deeply merges a partial configuration into an existing base configuration.
 */
export function mergeConfig(base: CodeShelfConfig, incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  const merged: CodeShelfConfig = {
    ...base,
    ...incoming,
    geminiApiKey:
      incoming.geminiApiKey !== undefined
        ? (incoming.geminiApiKey ? incoming.geminiApiKey.trim() : undefined)
        : base.geminiApiKey,
    geminiModel:
      incoming.geminiModel !== undefined
        ? (incoming.geminiModel ? incoming.geminiModel.trim() : undefined)
        : base.geminiModel,
    editor: {
      ...base.editor,
      ...(incoming.editor || {}),
    },
    customTechnologies: Array.from(
      new Set([...(base.customTechnologies || []), ...(incoming.customTechnologies || [])])
    ),
    customCategories: Array.from(
      new Set([...(base.customCategories || []), ...(incoming.customCategories || [])])
    ),
    customTags: Array.from(
      new Set([...(base.customTags || []), ...(incoming.customTags || [])])
    ),
    permissions: {
      ...base.permissions,
      ...(incoming.permissions || {}),
    },
  };

  return validateConfig(merged);
}
