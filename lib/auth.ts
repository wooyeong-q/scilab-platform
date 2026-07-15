import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'scilab_admin';
const SESSION_VALUE = 'scilab-admin-session';

function secret() {
  return process.env.SESSION_SECRET || '';
}

function token() {
  return createHmac('sha256', secret()).update(SESSION_VALUE).digest('hex');
}

export function verifyPassword(value: string) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  if (!secret()) return false;
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value || '';
  const expected = token();
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}
