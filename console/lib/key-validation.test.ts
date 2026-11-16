import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import { getKeyValidation, type KeyCheckRecord } from './key-validation';

const password = 'fixture-owner-password-0123456789012345';
const apiKey = 'fixture-api-key-abcdef';
const settings = { model: 'fixture-model' };
const record: KeyCheckRecord = {
  id: 'fixture', envKey: 'FIXTURE_API_KEY',
  credentialTag: createHmac('sha256', password).update(`fixture\0FIXTURE_API_KEY\0${apiKey}`).digest('hex'),
  configurationHash: createHash('sha256').update(JSON.stringify(settings)).digest('hex'),
  checkedAt: '2026-11-16T23:00:00Z', method: 'GET', endpoint: 'https://example.test/account',
  summary: 'Authenticated account check passed.', evidence: 'live', limitations: [],
  modelAccess: 'confirmed', modelAccessMessage: 'Fixture model returned.',
};
const env = { BENCHMARK_OWNER_PASSWORD: password, FIXTURE_API_KEY: apiKey };

test('a verification result is bound to the exact credential loaded at runtime without exposing the receipt', () => {
  const result = getKeyValidation('fixture', 'FIXTURE_API_KEY', env, settings, [record]);
  assert.equal(result.status, 'verified');
  assert.equal(result.modelAccess, 'confirmed');
  const serialized = JSON.stringify(result);
  for (const secret of [password, apiKey, record.credentialTag]) assert.equal(serialized.includes(secret), false);
});

test('a changed credential or owner secret cannot retain verified status', () => {
  for (const changed of [{ ...env, FIXTURE_API_KEY: 'different-key' }, { ...env, BENCHMARK_OWNER_PASSWORD: 'different-owner' }]) {
    const result = getKeyValidation('fixture', 'FIXTURE_API_KEY', changed, settings, [record]);
    assert.equal(result.status, 'credential_changed');
    assert.equal(result.modelAccess, 'not_checked');
  }
});

test('a model setting change invalidates only model confirmation while preserving a valid key check', () => {
  const result = getKeyValidation('fixture', 'FIXTURE_API_KEY', env, { model: 'different-model' }, [record]);
  assert.equal(result.status, 'verified');
  assert.equal(result.modelAccess, 'not_checked');
});

test('missing credentials and malformed receipt configuration fail closed', () => {
  assert.equal(getKeyValidation('fixture', 'FIXTURE_API_KEY', {}, settings, [record]).status, 'not_configured');
  assert.equal(getKeyValidation('fixture', 'FIXTURE_API_KEY', { ...env, BENCHMARK_KEY_VERIFICATIONS: 'invalid-json' }, settings).status, 'not_checked');
});

test('a key-only receipt cannot confirm model access without a valid matching settings hash', () => {
  for (const configurationHash of [null, '', 'invalid']) {
    const result = getKeyValidation('fixture', 'FIXTURE_API_KEY', env, settings, [{ ...record, configurationHash }]);
    assert.equal(result.status, 'verified');
    assert.equal(result.modelAccess, 'not_checked');
  }
});

test('malformed or secret-bearing timestamps are never exposed', () => {
  for (const checkedAt of [apiKey, password, record.credentialTag, 'invalid-date']) {
    const result = getKeyValidation('fixture', 'FIXTURE_API_KEY', env, settings, [{ ...record, checkedAt }]);
    assert.equal(result.checkedAt, null);
    for (const secret of [apiKey, password, record.credentialTag]) assert.equal(JSON.stringify(result).includes(secret), false);
  }
});

test('a malformed non-string credential tag fails closed without throwing', () => {
  const malformed = { ...record, credentialTag: [record.credentialTag] as unknown as string };
  assert.equal(getKeyValidation('fixture', 'FIXTURE_API_KEY', env, settings, [malformed]).status, 'not_checked');
});
