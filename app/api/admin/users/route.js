import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// GET /api/admin/users  –  list all users
// -------------------------------------------------------
export async function GET(request) {
  const [rows] = await pool.query(
    `SELECT id, username, email, role, is_active, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`,
  );

  const users = rows.map((u) => ({
    id:        u.id,
    username:  u.username,
    email:     u.email,
    role:      u.role,
    isActive:  Boolean(u.is_active),
    createdAt: new Date(u.created_at).toISOString(),
    updatedAt: new Date(u.updated_at).toISOString(),
  }));

  return NextResponse.json({ users });
}

// -------------------------------------------------------
// POST /api/admin/users  –  create a new user
// -------------------------------------------------------
export async function POST(request) {
  const adminId  = Number(request.headers.get('x-user-id'));
  const adminName = request.headers.get('x-username') ?? '';

  const body = await request.json().catch(() => null);
  const { username, email, password, role } = body ?? {};

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: 'username, email, and password are required.' },
      { status: 400 },
    );
  }

  if (!['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'role must be "admin" or "user".' }, { status: 400 });
  }

  // Validate password strength (min 8 chars, mixed case + digit or symbol)
  if (String(password).length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    );
  }

  const passwordHash = await hash(String(password), 12);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [
        String(username).trim().slice(0, 60),
        String(email).trim().slice(0, 255),
        passwordHash,
        role,
      ],
    );

    await createLog(adminId, adminName, 'admin_create_user', {
      details: { newUserId: result.insertId, newUsername: username },
    });

    return NextResponse.json({ ok: true, id: result.insertId }, { status: 201 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Username or email already exists.' },
        { status: 409 },
      );
    }
    console.error('[admin/users POST]', err);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
