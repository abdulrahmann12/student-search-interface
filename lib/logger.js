import pool from './db.js';

/**
 * Insert a record into action_logs.
 *
 * @param {number}      userId
 * @param {string}      username
 * @param {string}      action        – e.g. 'login', 'create_workspace', 'save_review'
 * @param {object}      [options]
 * @param {string|null} [options.workspaceId]
 * @param {string|null} [options.studentRowId]
 * @param {object|null} [options.details]   – extra JSON context
 */
export async function createLog(userId, username, action, options = {}) {
  const { workspaceId = null, studentRowId = null, details = null } = options;

  try {
    await pool.query(
      `INSERT INTO action_logs
         (user_id, username, action, workspace_id, student_row_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        action,
        workspaceId,
        studentRowId,
        details !== null ? JSON.stringify(details) : null,
      ],
    );
  } catch (err) {
    // Logging must never crash the main request
    console.error('[logger] Failed to write action log:', err?.message);
  }
}
