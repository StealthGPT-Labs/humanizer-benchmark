import assert from 'node:assert/strict';
import test from 'node:test';
import { getConsoleStatus } from './status';
import { GET as getEnvironmentTemplate } from '../app/api/env-template/route';

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
  assert.equal(status.detectors.some((provider) => String(provider.id) === 'originality'), false);
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

test('OpenRouter configures the quality judge without exposing its credential', () => {
  const status = getConsoleStatus({ OPENROUTER_API_KEY: 'private-openrouter-sentinel-5372' });
  assert.equal(status.supportServices.length, 1);
  assert.equal(status.supportServices[0]?.name, 'OpenRouter');
  assert.equal(status.supportServices[0]?.configured, true);
  assert.equal(status.environment.configuredCount, 1);
  assert.equal(JSON.stringify(status).includes('private-openrouter-sentinel-5372'), false);
});

test('unused Gateway and direct OpenAI credentials cannot mark required evaluation services configured', () => {
  const status = getConsoleStatus({ AI_GATEWAY_API_KEY: 'unused-gateway', OPENAI_API_KEY: 'unused-openai' });
  assert.equal(status.environment.configuredCount, 0);
  assert.equal(status.supportServices.every((service) => !service.configured), true);
});

test('the authenticated key download requests OpenRouter for judges and omits unused credentials', async () => {
  const previous = process.env.BENCHMARK_OWNER_PASSWORD;
  const password = 'template-test-owner-password-0123456789';
  process.env.BENCHMARK_OWNER_PASSWORD = password;
  try {
    const authorization = `Basic ${Buffer.from(`owner:${password}`).toString('base64')}`;
    const response = getEnvironmentTemplate(new Request('https://example.test/api/env-template', { headers: { authorization } }));
    assert.equal(response.status, 200);
    const template = await response.text();
    assert.match(template, /^OPENROUTER_API_KEY=$/m);
    assert.doesNotMatch(template, /^AI_GATEWAY_API_KEY=/m);
    assert.doesNotMatch(template, /^OPENAI_API_KEY=/m);
    assert.equal(template.includes(password), false);
  } finally {
    if (previous === undefined) delete process.env.BENCHMARK_OWNER_PASSWORD;
    else process.env.BENCHMARK_OWNER_PASSWORD = previous;
  }
});
