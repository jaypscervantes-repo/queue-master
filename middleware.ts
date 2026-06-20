import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PLAYER_ROUTES = ['/player/login', '/player/signup'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/player')) return NextResponse.next();
  if (PUBLIC_PLAYER_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next();

  // Quick cookie-presence check. Real signature verification happens server-side
  // in the page using getCurrentPlayer().
  const cookie = req.cookies.get('qm_session');
  if (!cookie) {
    const url = new URL('/player/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/player/:path*',
};
