import { createHash, timingSafeEqual } from 'node:crypto';

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Authorization',
};

function deny(status: number, error: string, challenge = false): Response {
  return Response.json({ error }, {
    status,
    headers: {
      ...privateHeaders,
      ...(challenge ? { 'WWW-Authenticate': 'Basic realm="Humanizer Benchmark", charset="UTF-8"' } : {}),
    },
  });
}

/** Shared server-side guard; API handlers repeat it independently of Proxy. */
export function authorizeOwner(
  headers: Pick<Headers, 'get'>,
  password: string | undefined = process.env.BENCHMARK_OWNER_PASSWORD,
): Response | null {
  if (!password || password.trim().length < 32) {
    return deny(503, 'Owner access has not been configured.');
  }

  const authorization = headers.get('authorization');
  if (!authorization || authorization.length > 4096) {
    return deny(401, 'Owner authentication required.', true);
  }

  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match || match[1].length % 4 !== 0) {
    return deny(401, 'Owner authentication required.', true);
  }

  const supplied = Buffer.from(match[1], 'base64');
  if (supplied.toString('base64') !== match[1]) {
    return deny(401, 'Owner authentication required.', true);
  }

  const suppliedHash = createHash('sha256').update(supplied).digest();
  const expectedHash = createHash('sha256').update(`owner:${password}`, 'utf8').digest();
  return timingSafeEqual(suppliedHash, expectedHash)
    ? null
    : deny(401, 'Owner authentication required.', true);
}

/** Basic-auth credentials are ambient in browsers, so mutations also need CSRF checks. */
export function guardMutation(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (origin !== new URL(request.url).origin || (site !== null && site !== 'same-origin')) {
    return deny(403, 'A same-origin request is required.');
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return deny(415, 'A JSON request is required.');
  }

  return null;
}
