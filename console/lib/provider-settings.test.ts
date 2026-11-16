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

test('Phrasly stays on hold until Ultra access arrives even when its API key is configured', () => {
  const status = getConsoleStatus({ PHRASLY_API_KEY: 'private-phrasly-sentinel-8723' });
  const phrasly = status.humanizers.find(provider => provider.id === 'phrasly');
  assert.ok(phrasly?.participation, 'Humanizer participation must be explicit');
  assert.equal(phrasly.configured, true);
  assert.equal(phrasly.participation.status, 'on_hold');
  assert.match(phrasly.participation.reason, /Ultra/);
  assert.equal(status.roster.plannedHumanizers, 9);
  assert.equal(status.roster.onHoldHumanizers, 1);
  assert.equal(JSON.stringify(status).includes('private-phrasly-sentinel-8723'), false);
  assert.equal(status.execution.canRun, false);
});

test('the requested humanization policy follows documented effectiveness over a literal mode name', () => {
  const status = getConsoleStatus();
  assert.equal(status.modelPolicy.selectionPriority, 'vendor_recommended_effectiveness');
  const hix = status.humanizers.find(provider => provider.id === 'hix');
  assert.equal(hix?.configuration.requestExample.mode, 'Latest');
});
