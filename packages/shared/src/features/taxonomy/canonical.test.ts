import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizeTechnology,
  canonicalizeLanguage,
  normalizeTechnology,
  normalizeLanguage,
  normalizeExtension,
  detectLanguageFromFilename,
  normalizeTag,
  normalizeTags,
  normalizeTechnologies,
  matchesTechnologyOrTag,
} from './canonical';

test('canonicalizeTechnology maps .ts, .TS, .Ts, and .tS to TypeScript', () => {
  assert.equal(canonicalizeTechnology('.ts'), 'TypeScript');
  assert.equal(canonicalizeTechnology('.TS'), 'TypeScript');
  assert.equal(canonicalizeTechnology('.Ts'), 'TypeScript');
  assert.equal(canonicalizeTechnology('.tS'), 'TypeScript');
  assert.equal(canonicalizeTechnology('ts'), 'TypeScript');
  assert.equal(canonicalizeTechnology('typescript'), 'TypeScript');
  assert.equal(canonicalizeTechnology('TypeScript'), 'TypeScript');
});

test('canonicalizeTechnology maps cpp, C++, .cpp, and .CPP to canonical C++', () => {
  assert.equal(canonicalizeTechnology('cpp'), 'C++');
  assert.equal(canonicalizeTechnology('C++'), 'C++');
  assert.equal(canonicalizeTechnology('c++'), 'C++');
  assert.equal(canonicalizeTechnology('.cpp'), 'C++');
  assert.equal(canonicalizeTechnology('.CPP'), 'C++');
  assert.equal(canonicalizeTechnology('cc'), 'C++');
  assert.equal(canonicalizeTechnology('.cxx'), 'C++');
});

test('canonicalizeLanguage maps extension and technology names to canonical lowercase identifiers', () => {
  assert.equal(canonicalizeLanguage('.TS'), 'typescript');
  assert.equal(canonicalizeLanguage('TypeScript'), 'typescript');
  assert.equal(canonicalizeLanguage('.CPP'), 'cpp');
  assert.equal(canonicalizeLanguage('C++'), 'cpp');
  assert.equal(canonicalizeLanguage('.py'), 'python');
  assert.equal(canonicalizeLanguage('Python'), 'python');
  assert.equal(canonicalizeLanguage('.rs'), 'rust');
  assert.equal(canonicalizeLanguage('Rust'), 'rust');
});

test('detectLanguageFromFilename detects extension and canonical technology', () => {
  const tsRes = detectLanguageFromFilename('binarySearch.TS');
  assert.ok(tsRes);
  assert.equal(tsRes?.language, 'typescript');
  assert.equal(tsRes?.technology, 'TypeScript');
  assert.equal(tsRes?.extension, '.ts');

  const cppRes = detectLanguageFromFilename('quickSort.CPP');
  assert.ok(cppRes);
  assert.equal(cppRes?.language, 'cpp');
  assert.equal(cppRes?.technology, 'C++');
  assert.equal(cppRes?.extension, '.cpp');

  const pyRes = detectLanguageFromFilename('model.py');
  assert.ok(pyRes);
  assert.equal(pyRes?.language, 'python');
  assert.equal(pyRes?.technology, 'Python');
});

test('normalizeTag cleans and canonicalizes language extensions to uniform tags', () => {
  assert.equal(normalizeTag('#TypeScript'), 'typescript');
  assert.equal(normalizeTag('.TS'), 'typescript');
  assert.equal(normalizeTag('.cpp'), 'cpp');
  assert.equal(normalizeTag('C++'), 'cpp');
  assert.equal(normalizeTag('#react'), 'react');
  assert.equal(normalizeTag('dsa'), 'dsa');
});

test('normalizeTags eliminates duplicate tags case-insensitively', () => {
  const rawTags = ['TypeScript', '.TS', 'typescript', '#ts', 'algorithms', 'Algorithms'];
  const normalized = normalizeTags(rawTags);
  assert.deepEqual(normalized, ['typescript', 'algorithms']);
});

test('normalizeTechnologies canonicalizes and eliminates duplicates', () => {
  const rawTech = ['cpp', 'C++', '.CPP', '.cpp', 'TypeScript', '.ts', 'typescript'];
  const normalized = normalizeTechnologies(rawTech);
  assert.deepEqual(normalized, ['C++', 'TypeScript']);
});

test('matchesTechnologyOrTag compares case-insensitively and through canonical equivalents', () => {
  assert.ok(matchesTechnologyOrTag('.ts', 'TypeScript'));
  assert.ok(matchesTechnologyOrTag('typescript', '.TS'));
  assert.ok(matchesTechnologyOrTag('cpp', 'C++'));
  assert.ok(matchesTechnologyOrTag('.CPP', 'cpp'));
  assert.ok(matchesTechnologyOrTag('python', '.PY'));
  assert.ok(!matchesTechnologyOrTag('python', 'rust'));
});

test('normalizeTechnology, normalizeLanguage, and normalizeExtension handle extensions and case variants', () => {
  assert.equal(normalizeTechnology('.ts'), 'TypeScript');
  assert.equal(normalizeTechnology('TYPESCRIPT'), 'TypeScript');
  assert.equal(normalizeTechnology('cpp'), 'C++');
  assert.equal(normalizeTechnology('C++'), 'C++');
  assert.equal(normalizeLanguage('.TS'), 'typescript');
  assert.equal(normalizeLanguage('TypeScript'), 'typescript');
  assert.equal(normalizeLanguage('C++'), 'cpp');
  assert.equal(normalizeLanguage('.cpp'), 'cpp');
  assert.equal(normalizeExtension('.ts'), '.ts');
  assert.equal(normalizeExtension('.TS'), '.ts');
  assert.equal(normalizeExtension('tS'), '.ts');
  assert.equal(normalizeExtension('Ts'), '.ts');
  assert.equal(normalizeExtension('.CPP'), '.cpp');
});

