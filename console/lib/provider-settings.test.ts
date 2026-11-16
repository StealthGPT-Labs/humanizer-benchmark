import assert from 'node:assert/strict';
import test from 'node:test';
import { getConsoleStatus } from './status';

test('every selected provider explains its requested settings and separates documentation from account access', () => {
  const status = getConsoleStatus();
  for (const provider of [...status.humanizers, ...status.detectors]) {
    assert.ok(provider.configuration, `${provider.name} needs a configuration profile`);
    assert.equal(provider.configuration.accountAccess, 'not_checked');
    assert.match(provider.configuration.checkedDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(provider.configuration.sources.length > 0);
    assert.ok(provider.configuration.sources.every(source => source.url.startsWith('https://')));
  }
});

test('uncertain provider settings stay visible and cannot be mistaken for a runnable benchmark', () => {
  const status = getConsoleStatus();
  assert.ok(status.modelPolicy, 'The console needs an explicit model-selection policy');
  assert.equal(status.modelPolicy.noSilentFallback, true);
  assert.equal(status.modelPolicy.verifiedAccountCount, 0);
  assert.equal(status.execution.canRun, false);
  for (const provider of [...status.humanizers, ...status.detectors]) {
    const profile = provider.configuration;
    if (profile.verificationStatus !== 'documented') {
      assert.ok(profile.blockers.length > 0, `${provider.name} must explain its unresolved settings`);
    }
  }
});
