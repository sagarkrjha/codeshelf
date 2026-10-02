import type { CreateSnippetInput, Snippet } from '../../models/models';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCreateSnippetInput(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'] };
  }

  const candidate = input as Partial<CreateSnippetInput>;

  if (typeof candidate.title !== 'string' || candidate.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (typeof candidate.code !== 'string' || candidate.code.length === 0) {
    errors.push('Code is required and cannot be empty');
  }

  if (typeof candidate.language !== 'string' || candidate.language.trim().length === 0) {
    errors.push('Language is required and must be specified');
  }

  if (candidate.tags !== undefined && !Array.isArray(candidate.tags)) {
    errors.push('Tags must be an array of strings');
  }

  if (candidate.technology !== undefined && !Array.isArray(candidate.technology)) {
    errors.push('Technology must be an array of strings');
  }

  if (candidate.usage !== undefined && !Array.isArray(candidate.usage)) {
    errors.push('Usage must be an array of strings');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateSnippet(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Snippet must be an object'] };
  }

  const candidate = input as Partial<Snippet>;

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    errors.push('ID is required');
  }

  const baseValidation = validateCreateSnippetInput(input);
  errors.push(...baseValidation.errors);

  if (typeof candidate.createdAt !== 'string' || Number.isNaN(Date.parse(candidate.createdAt))) {
    errors.push('createdAt must be a valid ISO date string');
  }

  if (typeof candidate.updatedAt !== 'string' || Number.isNaN(Date.parse(candidate.updatedAt))) {
    errors.push('updatedAt must be a valid ISO date string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
