import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

function parseJsonSafe(value, fallback) {
  if (typeof value === 'object' && value !== null) return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

/** Returns true when the requesting user may read/write this workspace. */
async function hasWorkspaceAccess(workspaceId, userId, role) {
  if (role === 'admin') return true;
  const [rows] = await pool.query(
    'SELECT id FROM workspace_assignments WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, userId],
  );
  return rows.length > 0;
}

// -------------------------------------------------------
// GET /api/workspaces/[id]
// Admins: any workspace.  Users: only if assigned.
// -------------------------------------------------------
export async function GET(request, { params }) {
  const userId = Number(request.headers.get('x-user-id'));
  const role   = request.headers.get('x-user-role') ?? 'user';
  const { id } = await params;

  if (!(await hasWorkspaceAccess(id, userId, role))) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  const [rows] = await pool.query(
    `SELECT w.id, w.name, w.file_name, w.students, w.subject_columns,
            w.export_columns, w.header_rows, w.created_by, w.created_at,
            w.updated_at, u.username AS created_by_username
     FROM workspaces w
     JOIN users u ON u.id = w.created_by
     WHERE w.id = ?`,
    [id],
  );

  const w = rows[0];
  if (!w) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  const [selRows] = await pool.query(
    `SELECT row_id, selected_course_keys, reviewed_at, last_edited_at
     FROM manual_selections WHERE workspace_id = ?`,
    [id],
  );

  const manualSelections = {};
  for (const sel of selRows) {
    manualSelections[sel.row_id] = {
      selectedCourseKeys: parseJsonSafe(sel.selected_course_keys, []),
      reviewedAt:   sel.reviewed_at ? new Date(sel.reviewed_at).toISOString() : null,
      lastEditedAt: sel.last_edited_at ? new Date(sel.last_edited_at).toISOString() : null,
    };
  }

  return NextResponse.json({
    workspace: {
      id:                  w.id,
      name:                w.name,
      fileName:            w.file_name,
      students:            parseJsonSafe(w.students, []),
      subjectColumns:      parseJsonSafe(w.subject_columns, []),
      exportColumns:       parseJsonSafe(w.export_columns, []),
      headerRows:          parseJsonSafe(w.header_rows, []),
      manualSelections,
      searchQuery:         '',
      selectedStudentRowId: null,
      createdByUsername:   w.created_by_username ?? null,
      createdAt:           new Date(w.created_at).toISOString(),
      updatedAt:           new Date(w.updated_at).toISOString(),
    },
  });
}

// -------------------------------------------------------
// DELETE /api/workspaces/[id]
// Admin-only.
// -------------------------------------------------------
export async function DELETE(request, { params }) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? '';
  const role     = request.headers.get('x-user-role') ?? 'user';
  const { id }   = await params;

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete workspaces.' }, { status: 403 });
  }

  const [check] = await pool.query('SELECT id, name FROM workspaces WHERE id = ?', [id]);
  if (!check[0]) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  // manual_selections & workspace_assignments cascade-deleted via FK
  await pool.query('DELETE FROM workspaces WHERE id = ?', [id]);

  await createLog(userId, username, 'delete_workspace', {
    workspaceId: id,
    details: { workspaceName: check[0].name },
  });

  return NextResponse.json({ ok: true });
}
