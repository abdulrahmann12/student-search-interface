import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// -------------------------------------------------------
// GET /api/logs
// Admin-only: returns paginated action log entries.
// Query params:
//   page (default 1), limit (default 50, max 200)
//   userId       – exact user ID
//   username     – partial username match (LIKE %...%)
//   action       – exact action string
//   workspaceId  – exact workspace ID
//   dateFrom     – ISO date string (inclusive)
//   dateTo       – ISO date string (inclusive, end of day)
// -------------------------------------------------------
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page            = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit           = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
  const offset          = (page - 1) * limit;
  const filterUserId    = searchParams.get('userId');
  const filterUsername  = searchParams.get('username');
  const filterAction    = searchParams.get('action');
  const filterWs        = searchParams.get('workspaceId');
  const filterDateFrom  = searchParams.get('dateFrom');
  const filterDateTo    = searchParams.get('dateTo');

  const conditions = [];
  const values     = [];

  if (filterUserId) {
    conditions.push('l.user_id = ?');
    values.push(Number(filterUserId));
  }
  if (filterUsername) {
    conditions.push('l.username LIKE ?');
    values.push(`%${filterUsername}%`);
  }
  if (filterAction) {
    conditions.push('l.action = ?');
    values.push(filterAction);
  }
  if (filterWs) {
    conditions.push('l.workspace_id = ?');
    values.push(filterWs);
  }
  if (filterDateFrom) {
    conditions.push('l.created_at >= ?');
    values.push(new Date(filterDateFrom).toISOString().slice(0, 10) + ' 00:00:00');
  }
  if (filterDateTo) {
    conditions.push('l.created_at <= ?');
    values.push(new Date(filterDateTo).toISOString().slice(0, 10) + ' 23:59:59');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM action_logs l ${where}`,
    values,
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT l.id, l.user_id, l.username, l.action,
            l.workspace_id, l.student_row_id, l.details, l.created_at,
            u.email AS user_email,
            w.name  AS workspace_name
     FROM action_logs l
     LEFT JOIN users      u ON u.id = l.user_id
     LEFT JOIN workspaces w ON w.id = l.workspace_id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const logs = rows.map((r) => ({
    id:            r.id,
    userId:        r.user_id,
    username:      r.username,
    userEmail:     r.user_email ?? null,
    action:        r.action,
    workspaceId:   r.workspace_id ?? null,
    workspaceName: r.workspace_name ?? null,
    studentRowId:  r.student_row_id ?? null,
    details:       r.details ? parseJsonSafe(r.details) : null,
    createdAt:     new Date(r.created_at).toISOString(),
  }));

  return NextResponse.json({ logs, total, page, limit });
}

function parseJsonSafe(value) {
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

