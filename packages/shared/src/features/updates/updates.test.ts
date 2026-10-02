import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSemver, isNewerVersion } from './updates';

test('parseSemver parses standard semver', () => {
  assert.deepEqual(parseSemver('1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseSemver('v0.1.0'), [0, 1, 0]);
  assert.deepEqual(parseSemver('v2.4.1-beta.1'), [2, 4, 1]);
  assert.deepEqual(parseSemver(''), [0, 0, 0]);
});

test('isNewerVersion detects newer versions correctly', () => {
  assert.equal(isNewerVersion('0.2.0', '0.1.0'), true);
  assert.equal(isNewerVersion('v0.1.1', 'v0.1.0'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
  assert.equal(isNewerVersion('0.1.0', '0.1.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.2.0'), false);
  assert.equal(isNewerVersion('0.1.0', '1.0.0'), false);
});
