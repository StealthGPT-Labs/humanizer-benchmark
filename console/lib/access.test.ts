import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizeOwner, guardMutation } from './access';
import { POST } from '../app/api/runs/route';

const password = 'test-only-owner-password-0123456789abcdef';
const basic = (value: string) => `Basic ${Buffer.from(value).toString('base64')}`;
const ownerHeaders = () => new Headers({ authorization: basic(`owner:${password}`) });

test('an unset or weak owner password fails closed, even with matching credentials', () => {
  for (const configured of ['', 'short', 'x'.repeat(31)]) {
    const result = authorizeOwner(new Headers({ authorization: basic(`owner:${configured}`) }), configured);
    assert.equal(result?.status, 503);
    assert.equal(result?.headers.has('www-authenticate'), false);
  }
});

test('a protected request without credentials receives a private authentication challenge', async () => {
  const result = authorizeOwner(new Headers(), password);
  assert.equal(result?.status, 401);
  assert.equal(result?.headers.get('www-authenticate'), 'Basic realm="Humanizer Benchmark", charset="UTF-8"');
  assert.match(result?.headers.get('cache-control') ?? '', /no-store/);
  assert.equal((await result!.text()).includes(password), false);
});

test('only the owner username and exact password are authorized', () => {
  assert.equal(authorizeOwner(ownerHeaders(), password), null);
  for (const credentials of [`other:${password}`, `owner:${password}x`, 'owner:wrong', `OWNER:${password}`]) {
    assert.equal(authorizeOwner(new Headers({ authorization: basic(credentials) }), password)?.status, 401);
  }
});

test('malformed authentication and alternate schemes are rejected without throwing', () => {
  for (const authorization of ['Bearer secret', 'Basic', 'Basic !!!', 'Basic b3duZXI6cGFzcw', `Basic ${Buffer.from(`owner:${password}`).toString('base64')}!`, 'Basic Zm9v', `Basic ${'A'.repeat(5000)}`]) {
    assert.equal(authorizeOwner(new Headers({ authorization }), password)?.status, 401);
  }
});

test('same-origin JSON mutations are allowed through the origin guard', () => {
  const request = new Request('https://benchmark.example/api/runs', {
    method: 'POST',
    headers: { origin: 'https://benchmark.example', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json; charset=utf-8' },
    body: '{}',
  });
  assert.equal(guardMutation(request), null);
});

test('cross-origin, same-site, absent, and malformed origins cannot mutate the console', () => {
  const attempts: Record<string, string>[] = [
    { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
    { origin: 'https://benchmark.example', 'sec-fetch-site': 'same-site' },
    { origin: 'https://benchmark.example/path', 'sec-fetch-site': 'same-origin' },
    { origin: 'null', 'sec-fetch-site': 'same-origin' },
    {},
  ];
  for (const headers of attempts) {
    const result = guardMutation(new Request('https://benchmark.example/api/runs', {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}',
    }));
    assert.equal(result?.status, 403);
  }
});

test('form submissions cannot bypass mutation content-type checks', () => {
  const result = guardMutation(new Request('https://benchmark.example/api/runs', {
    method: 'POST',
    headers: { origin: 'https://benchmark.example', 'content-type': 'application/x-www-form-urlencoded' },
    body: 'run=true',
  }));
  assert.equal(result?.status, 415);
});

test('the run endpoint independently refuses requests without owner credentials', () => {
  process.env.BENCHMARK_OWNER_PASSWORD = password;
  const result = POST(new Request('https://benchmark.example/api/runs', { method: 'POST' }));
  assert.equal(result.status, 401);
});

test('the run endpoint independently refuses authenticated cross-origin requests', () => {
  process.env.BENCHMARK_OWNER_PASSWORD = password;
  const result = POST(new Request('https://benchmark.example/api/runs', {
    method: 'POST',
    headers: { authorization: basic(`owner:${password}`), origin: 'https://evil.example', 'content-type': 'application/json' },
    body: '{}',
  }));
  assert.equal(result.status, 403);
});

test('an authenticated same-origin request cannot start a benchmark while execution is on hold', async () => {
  process.env.BENCHMARK_OWNER_PASSWORD = password;
  const result = POST(new Request('https://benchmark.example/api/runs', {
    method: 'POST',
    headers: { authorization: basic(`owner:${password}`), origin: 'https://benchmark.example', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
    body: '{"start":true}',
  }));
  assert.equal(result.status, 423);
  assert.deepEqual(await result.json(), { error: 'Benchmark execution is on hold.' });
  assert.match(result.headers.get('cache-control') ?? '', /no-store/);
});
