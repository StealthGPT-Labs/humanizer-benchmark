import { authorizeOwner, guardMutation } from '@/lib/access';

export function POST(request: Request) {
  const denied = authorizeOwner(request.headers) ?? guardMutation(request);
  if (denied) return denied;

  // This deployment cannot execute a benchmark, including when all keys are configured.
  return Response.json({ error: 'Benchmark execution is on hold.' }, {
    status: 423,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Authorization',
    },
  });
}
