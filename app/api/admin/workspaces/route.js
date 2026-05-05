import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// GET /api/admin/workspaces
// Admin-only: returns all workspaces with their current
// assignment list (which users have access).
// -------------------------------------------------------
export async function GET() {
  const [workspaceRows] = await pool.query(
    `SELECT w.id, w.name, w.file_name, w.created_by, w.created_at, w.updated_at,
            u.username AS created_by_username,
            (SELECT COUNT(*) FROM manual_selections ms WHERE ms.workspace_id = w.id) AS review_count,
            (SELECT COUNT(*) FROM workspace_assignments wa WHERE wa.workspace_id = w.id) AS assigned_count
     FROM workspaces w
     JOIN users u ON u.id = w.created_by
     ORDER BY w.updated_at DESC`,
  );

  const workspaceIds = workspaceRows.map((w) => w.id);

  // Fetch all assignments with user details in one query
  let assignmentRows = [];
  if (workspaceIds.length > 0) {
    [assignmentRows] = await pool.query(
      `SELECT wa.workspace_id, wa.user_id, wa.assigned_at,
              u.username, u.email, u.role
       FROM workspace_assignments wa
       JOIN users u ON u.id = wa.user_id
       WHERE wa.workspace_id IN (?)
       ORDER BY wa.assigned_at ASC`,
      [workspaceIds],
    );
  }

  // Group by workspace
  const assignmentsByWs = {};
  for (const a of assignmentRows) {
    if (!assignmentsByWs[a.workspace_id]) assignmentsByWs[a.workspace_id] = [];
    assignmentsByWs[a.workspace_id].push({
      userId:      a.user_id,
      username:    a.username,
      email:       a.email,
      role:        a.role,
      assignedAt:  new Date(a.assigned_at).toISOString(),
    });
  }

  const workspaces = workspaceRows.map((w) => ({
    id:                w.id,
    name:              w.name,
    fileName:          w.file_name,
    createdByUsername: w.created_by_username,
    reviewCount:       Number(w.review_count),
    assignedCount:     Number(w.assigned_count),
    createdAt:         new Date(w.created_at).toISOString(),
    updatedAt:         new Date(w.updated_at).toISOString(),
    assignments:       assignmentsByWs[w.id] ?? [],
  }));

  return NextResponse.json({ workspaces });
}
