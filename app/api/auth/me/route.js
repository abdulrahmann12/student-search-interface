import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const userId = Number(request.headers.get('x-user-id'));

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const [rows] = await pool.query(
    'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = 1',
    [userId],
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
