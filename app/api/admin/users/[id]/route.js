import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// PUT /api/admin/users/[id]  –  update user (role / active / password)
// -------------------------------------------------------
export async function PUT(request, { params }) {
  const adminId   = Number(request.headers.get('x-user-id'));
  const adminName = request.headers.get('x-username') ?? '';
  const { id }    = await params;
  const targetId  = Number(id);

  const body = await request.json().catch(() => null);
  const { role, isActive, password } = body ?? {};

  // Fetch target user's current role before any changes
  const [targetRows] = await pool.query(
    'SELECT username, role FROM users WHERE id = ?',
    [targetId],
  );
  if (!targetRows[0]) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
  const targetUser = targetRows[0];

  // Admin cannot reset the password of another admin account
  if (password !== undefined && targetUser.role === 'admin' && targetId !== adminId) {
    return NextResponse.json(
      { error: 'Cannot change the password of another admin account.' },
      { status: 403 },
    );
  }

  const updates = [];
  const values  = [];

  if (role !== undefined) {
    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    updates.push('role = ?');
    values.push(role);
  }

  if (isActive !== undefined) {
    if (!isActive && targetId === adminId) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 },
      );
    }
    updates.push('is_active = ?');
    values.push(isActive ? 1 : 0);
  }

  if (password !== undefined) {
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }
    updates.push('password_hash = ?');
    values.push(await hash(String(password), 12));
  }

  if (!updates.length) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  values.push(targetId);
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

  await createLog(adminId, adminName, 'admin_update_user', {
    details: {
      targetUserId: targetId,
      targetUsername: targetUser.username,
      changes: Object.keys(body ?? {}),
    },
  });

  return NextResponse.json({ ok: true });
}

