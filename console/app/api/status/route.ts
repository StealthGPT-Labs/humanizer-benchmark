import { authorizeOwner } from '@/lib/access';
import { getConsoleStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const denied = authorizeOwner(request.headers);
  if (denied) return denied;

  return Response.json(getConsoleStatus(), {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Authorization',
    },
  });
}
