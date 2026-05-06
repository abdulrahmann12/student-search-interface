import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

async function hasWorkspaceAccess(workspaceId, userId, role) {
  if (role === 'admin') return true;
  const [rows] = await pool.query(
    'SELECT id FROM workspace_assignments WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, userId],
  );
  return rows.length > 0;
}

// -------------------------------------------------------
// PUT /api/workspaces/[id]/manual-selections
// Upsert a student's manual course selection.
//
// Body: {
//   rowId:              string,
//   selectedCourseKeys: string[],
//   reviewedAt:         string | null,
//   lastEditedAt:       string | null,
// }
// -------------------------------------------------------
export async function PUT(request, { params }) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? '';
  const role     = request.headers.get('x-user-role') ?? 'user';
  const { id }   = await params;

  const body = await request.json().catch(() => null);
  if (!body?.rowId) {
    return NextResponse.json({ error: 'rowId is required.' }, { status: 400 });
  }

  if (!(await hasWorkspaceAccess(id, userId, role))) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  // Fetch workspace name for richer log details
  const [wsRows] = await pool.query('SELECT name FROM workspaces WHERE id = ?', [id]);
  const workspaceName = wsRows[0]?.name ?? null;

  const { rowId, selectedCourseKeys, reviewedAt, lastEditedAt } = body;

  const reviewedAtValue   = reviewedAt   ? new Date(reviewedAt)   : null;
  const lastEditedAtValue = lastEditedAt ? new Date(lastEditedAt) : null;

  await pool.query(
    `INSERT INTO manual_selections
       (workspace_id, row_id, selected_course_keys, reviewed_at, last_edited_at, reviewed_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       selected_course_keys = VALUES(selected_course_keys),
       reviewed_at          = VALUES(reviewed_at),
       last_edited_at       = VALUES(last_edited_at),
       reviewed_by          = VALUES(reviewed_by)`,
    [
      id,
      String(rowId),
      JSON.stringify(Array.isArray(selectedCourseKeys) ? selectedCourseKeys : []),
      reviewedAtValue,
      lastEditedAtValue,
      reviewedAt ? userId : null,
    ],
  );

  // Touch the workspace updated_at
  await pool.query(
    'UPDATE workspaces SET updated_at = NOW() WHERE id = ?',
    [id],
  );

  const action = reviewedAt ? 'save_review' : 'edit_selection';
  await createLog(userId, username, action, {
    workspaceId: id,
    studentRowId: rowId,
    details: { workspaceName, courseCount: (selectedCourseKeys ?? []).length },
  });

  return NextResponse.json({ ok: true });
}

// -------------------------------------------------------
// DELETE /api/workspaces/[id]/manual-selections
// Remove a student's review (reset). rowId via query param.
// -------------------------------------------------------
export async function DELETE(request, { params }) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? '';
  const role     = request.headers.get('x-user-role') ?? 'user';
  const { id }   = await params;

  const { searchParams } = new URL(request.url);
  const rowId = searchParams.get('rowId');

  if (!rowId) {
    return NextResponse.json({ error: 'rowId query parameter is required.' }, { status: 400 });
  }

  if (!(await hasWorkspaceAccess(id, userId, role))) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  const [wsRows] = await pool.query('SELECT name FROM workspaces WHERE id = ?', [id]);
  const workspaceName = wsRows[0]?.name ?? null;

  await pool.query(
    'DELETE FROM manual_selections WHERE workspace_id = ? AND row_id = ?',
    [id, rowId],
  );

  await pool.query('UPDATE workspaces SET updated_at = NOW() WHERE id = ?', [id]);

  await createLog(userId, username, 'reset_review', {
    workspaceId: id,
    studentRowId: rowId,
    details: { workspaceName },
  });

  return NextResponse.json({ ok: true });
}
