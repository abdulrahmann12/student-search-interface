import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// GET /api/admin/workspaces/[id]/assignments
// List users currently assigned to a workspace.
// -------------------------------------------------------
export async function GET(request, { params }) {
  const { id } = await params;

  const [rows] = await pool.query(
    `SELECT wa.user_id, wa.assigned_at,
            u.username, u.email, u.role, u.is_active
     FROM workspace_assignments wa
     JOIN users u ON u.id = wa.user_id
     WHERE wa.workspace_id = ?
     ORDER BY wa.assigned_at ASC`,
    [id],
  );

  const assignments = rows.map((r) => ({
    userId:     r.user_id,
    username:   r.username,
    email:      r.email,
    role:       r.role,
    isActive:   Boolean(r.is_active),
    assignedAt: new Date(r.assigned_at).toISOString(),
  }));

  return NextResponse.json({ assignments });
}

// -------------------------------------------------------
// PUT /api/admin/workspaces/[id]/assignments
// Replace the full assignment list for a workspace.
// Body: { userIds: number[] }
// -------------------------------------------------------
export async function PUT(request, { params }) {
  const adminId   = Number(request.headers.get('x-user-id'));
  const adminName = request.headers.get('x-username') ?? '';
  const { id }    = await params;

  const body = await request.json().catch(() => null);
  const userIds = Array.isArray(body?.userIds) ? body.userIds.map(Number) : [];

  // Verify workspace exists
  const [wsCheck] = await pool.query('SELECT id, name FROM workspaces WHERE id = ?', [id]);
  if (!wsCheck[0]) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  // Replace assignments in a transaction
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM workspace_assignments WHERE workspace_id = ?', [id]);
    if (userIds.length > 0) {
      const rows = userIds.map((uid) => [id, uid, adminId]);
      await conn.query(
        'INSERT INTO workspace_assignments (workspace_id, user_id, assigned_by) VALUES ?',
        [rows],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[admin/workspaces assignments PUT]', err);
    return NextResponse.json({ error: 'Failed to update assignments.' }, { status: 500 });
  }
  conn.release();

  await createLog(adminId, adminName, 'admin_assign_workspace', {
    workspaceId: id,
    details: {
      workspaceName: wsCheck[0].name,
      assignedUserCount: userIds.length,
      userIds,
    },
  });

  return NextResponse.json({ ok: true });
}
