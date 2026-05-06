import { clearSessionCookie } from '@/lib/auth';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? 'unknown';

  if (userId) {
    await createLog(userId, username, 'logout');
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
