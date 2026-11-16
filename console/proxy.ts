import { NextResponse, type NextRequest } from 'next/server';
import { authorizeOwner } from './lib/access';

export function proxy(request: NextRequest) {
  const denied = authorizeOwner(request.headers);
  if (denied) return denied;

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static/).*)'],
};
