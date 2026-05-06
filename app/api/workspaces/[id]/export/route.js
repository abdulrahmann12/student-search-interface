import pool from '@/lib/db';
import { createLog } from '@/lib/logger';
import { NextResponse } from 'next/server';

// POST /api/workspaces/[id]/export  –  log that a report was exported
export async function POST(request, { params }) {
  const userId   = Number(request.headers.get('x-user-id'));
  const username = request.headers.get('x-username') ?? '';
  const { id }   = await params;

  // Verify ownership
  const [rows] = await pool.query(
    'SELECT id FROM workspaces WHERE id = ? AND created_by = ?',
    [id, userId],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  await createLog(userId, username, 'export', { workspaceId: id });

  return NextResponse.json({ ok: true });
}
