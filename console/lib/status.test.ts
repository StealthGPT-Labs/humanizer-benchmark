import assert from 'node:assert/strict';
import test from 'node:test';
import { getConsoleStatus } from './status';

test('configuration status never includes credential values or unrelated environment variables', () => {
  const status = getConsoleStatus({
    STEALTHGPT_API_KEY: 'secret-stealth-sentinel-7341',
    ORIGINALITY_API_KEY: 'secret-originality-sentinel-9260',
    DATABASE_URL: 'postgres://private-sentinel-2285',
  });
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('secret-stealth-sentinel-7341'), false);
  assert.equal(serialized.includes('secret-originality-sentinel-9260'), false);
  assert.equal(serialized.includes('postgres://private-sentinel-2285'), false);
  assert.equal(status.humanizers.find((provider) => provider.id === 'stealth')?.configured, true);
  assert.equal(status.detectors.find((provider) => provider.id === 'originality')?.configured, true);
  assert.equal(status.detectors.find((provider) => provider.id === 'originality5')?.configured, true);
  assert.equal(status.environment.configuredCount, 2);
});

test('missing and blank credentials are reported as unconfigured', () => {
  const status = getConsoleStatus({ STEALTHGPT_API_KEY: '  ', GPTZERO_API_KEY: '' });
  assert.equal(status.environment.configuredCount, 0);
  assert.equal(status.humanizers.every((provider) => !provider.configured), true);
  assert.equal(status.detectors.every((provider) => !provider.configured), true);
});

test('environment variables cannot enable execution before instructions are finalized', () => {
  const status = getConsoleStatus({ RUN_BENCHMARK: 'true', BENCHMARK_ENABLED: 'true' });
  assert.equal(status.execution.canRun, false);
  assert.equal(status.execution.status, 'on_hold');
});
