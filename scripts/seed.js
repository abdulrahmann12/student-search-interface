/**
 * Seed script – creates the initial admin user.
 *
 * Usage (after importing db.sql and filling in .env):
 *   node scripts/seed.js
 *
 * The script is idempotent: running it again will not create
 * a duplicate if the admin username already exists.
 */

import { hash } from 'bcryptjs';
import { createConnection } from 'mysql2/promise';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the project root
const __dirname = fileURLToPath(new URL('.', import.meta.url));
process.loadEnvFile(resolve(__dirname, '../.env'));

const DEFAULT_USERNAME = 'thisismrismail';
const DEFAULT_EMAIL    = 'ismail.sherif@seu.edu.eg';
const DEFAULT_PASSWORD = 'mainadmin';

async function main() {
  const connection = await createConnection({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    timezone: '+00:00',
  });

  try {
    const [rows] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [DEFAULT_USERNAME],
    );

    if (rows.length > 0) {
      console.log(`ℹ  Admin user "${DEFAULT_USERNAME}" already exists – skipping creation.`);
      return;
    }

    const passwordHash = await hash(DEFAULT_PASSWORD, 12);

    await connection.query(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'admin', 1)`,
      [DEFAULT_USERNAME, DEFAULT_EMAIL, passwordHash],
    );

    console.log('✓  Initial admin user created successfully.');
    console.log(`   Username : ${DEFAULT_USERNAME}`);
    console.log(`   Password : ${DEFAULT_PASSWORD}`);
    console.log('   ⚠  Change this password immediately after first login.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('✗  Seed failed:', err.message);
  process.exit(1);
});
