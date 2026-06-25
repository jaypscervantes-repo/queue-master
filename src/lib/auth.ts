import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production-2026';
const COOKIE_NAME = 'qm_session';
const SESSION_DAYS = 30;

export type Role = 'player' | 'qmaster';

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(id: string, role: Role): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ id, role, exp })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): { id: string; role: Role } | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    if (sign(body) !== sig) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof data.id !== 'string' || (data.role !== 'player' && data.role !== 'qmaster') || data.exp < Date.now()) {
      return null;
    }
    return { id: data.id, role: data.role };
  } catch {
    return null;
  }
}

export function hashPin(pin: string, salt?: string): string {
  const useSalt = salt ?? crypto.randomBytes(16).toString('base64');
  const hash = crypto.pbkdf2Sync(pin, useSalt, 100_000, 32, 'sha256').toString('base64');
  return `${useSalt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt] = stored.split(':');
  if (!salt) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hashPin(pin, salt)), Buffer.from(stored));
  } catch {
    return false;
  }
}

export function getSession(): { id: string; role: Role } | null {
  const c = cookies().get(COOKIE_NAME);
  if (!c) return null;
  return verifySessionToken(c.value);
}

export function getSessionPlayerId(): string | null {
  const s = getSession();
  return s?.role === 'player' ? s.id : null;
}

export function getSessionQMasterId(): string | null {
  const s = getSession();
  return s?.role === 'qmaster' ? s.id : null;
}


export async function getCurrentPlayer() {
  const id = getSessionPlayerId();
  if (!id) return null;
  return prisma.player.findUnique({ where: { id } });
}

export async function getCurrentQMaster() {
  const id = getSessionQMasterId();
  if (!id) return null;
  return prisma.qMaster.findUnique({ where: { id } });
}


export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,20}$/i.test(u);
}
