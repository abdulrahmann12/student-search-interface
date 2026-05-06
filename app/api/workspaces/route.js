import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// GET /api/workspaces
// Admins: all workspaces.
// Users:  only workspaces they have been assigned to.
// Both:   includes manual_selections merged in, plus
//         the username of whoever created the workspace.
// -------------------------------------------------------
export async function GET(request) {
  const userId = Number(request.headers.get('x-user-id'));
  const role   = request.headers.get('x-user-role') ?? 'user';

  let workspaceRows;

  if (role === 'admin') {
    [workspaceRows] = await pool.query(
      `SELECT w.id, w.name, w.file_name, w.students, w.subject_columns,
              w.export_columns, w.header_rows, w.created_by, w.created_at,
              w.updated_at, u.username AS created_by_username
       FROM workspaces w
       JOIN users u ON u.id = w.created_by
       ORDER BY w.updated_at DESC`,
    );
  } else {
    [workspaceRows] = await pool.query(
      `SELECT w.id, w.name, w.file_name, w.students, w.subject_columns,
              w.export_columns, w.header_rows, w.created_by, w.created_at,
              w.updated_at, u.username AS created_by_username
       FROM workspaces w
       JOIN users u ON u.id = w.created_by
       INNER JOIN workspace_assignments wa
               ON wa.workspace_id = w.id AND wa.user_id = ?
       ORDER BY w.updated_at DESC`,
      [userId],
    );
  }

  if (!workspaceRows.length) {
    return NextResponse.json({ workspaces: [] });
  }

  const workspaceIds = workspaceRows.map((w) => w.id);

  const [selectionRows] = await pool.query(
    `SELECT workspace_id, row_id, selected_course_keys, reviewed_at, last_edited_at
     FROM manual_selections
     WHERE workspace_id IN (?)`,
    [workspaceIds],
  );

  // Group selections by workspace_id
  const selectionsByWorkspace = {};
  for (const sel of selectionRows) {
    if (!selectionsByWorkspace[sel.workspace_id]) {
      selectionsByWorkspace[sel.workspace_id] = {};
    }
    selectionsByWorkspace[sel.workspace_id][sel.row_id] = {
      selectedCourseKeys: parseJsonSafe(sel.selected_course_keys, []),
      reviewedAt:   sel.reviewed_at ? new Date(sel.reviewed_at).toISOString() : null,
      lastEditedAt: sel.last_edited_at ? new Date(sel.last_edited_at).toISOString() : null,
    };
  }

  const workspaces = workspaceRows.map((w) => ({
    id:                  w.id,
    name:                w.name,
    fileName:            w.file_name,
    students:            parseJsonSafe(w.students, []),
    subjectColumns:      parseJsonSafe(w.subject_columns, []),
    exportColumns:       parseJsonSafe(w.export_columns, []),
    headerRows:          parseJsonSafe(w.header_rows, []),
    manualSelections:    selectionsByWorkspace[w.id] ?? {},
    searchQuery:         '',
    selectedStudentRowId: null,
    createdByUsername:   w.created_by_username ?? null,
    createdAt:           new Date(w.created_at).toISOString(),
    updatedAt:           new Date(w.updated_at).toISOString(),
  }));

  return NextResponse.json({ workspaces });
}

// -------------------------------------------------------
// POST /api/workspaces
// Admin-only: creates a new workspace from a parsed Excel
// upload.
// -------------------------------------------------------
export async function POST(request) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? '';
  const role     = request.headers.get('x-user-role') ?? 'user';

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create workspaces.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { id, name, fileName, students, subjectColumns, exportColumns, headerRows } = body;

  if (!id || !name) {
    return NextResponse.json({ error: 'id and name are required.' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO workspaces
       (id, name, file_name, students, subject_columns, export_columns, header_rows, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(id),
      String(name).slice(0, 255),
      String(fileName ?? '').slice(0, 255),
      JSON.stringify(students ?? []),
      JSON.stringify(subjectColumns ?? []),
      JSON.stringify(exportColumns ?? []),
      JSON.stringify(headerRows ?? []),
      userId,
    ],
  );

  await createLog(userId, username, 'create_workspace', {
    workspaceId: id,
    details: { name, fileName, studentCount: (students ?? []).length },
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function parseJsonSafe(value, fallback) {
  if (typeof value === 'object' && value !== null) return value; // mysql2 auto-parsed
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
