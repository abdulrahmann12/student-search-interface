import { setSessionCookie, signToken } from '@/lib/auth';
import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const { username, password } = body ?? {};

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 },
      );
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = ? AND is_active = 1',
      [String(username).trim()],
    );

    const user = rows[0];

    // Use a constant-time compare even on a non-existent user to prevent
    // timing-based username enumeration.
    const dummyHash = '$2b$12$invalidhashusedtomakeconstanttime';
    const passwordMatch = user
      ? await compare(String(password), user.password_hash)
      : await compare(String(password), dummyHash).then(() => false);

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 },
      );
    }

    const token = await signToken({
      userId:   user.id,
      username: user.username,
      role:     user.role,
    });

    await createLog(user.id, user.username, 'login');

    const response = NextResponse.json({
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
