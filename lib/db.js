import mysql from 'mysql2/promise';

// Connection pool – shared across all API route invocations in the same
// Node.js process. Next.js hot-reload can reinitialize this module, so we
// stash the pool on the global object in development to avoid exhausting
// connections during rapid reloads.

let pool;

if (process.env.NODE_ENV === 'production') {
  pool = createPool();
} else {
  if (!global._mysqlPool) {
    global._mysqlPool = createPool();
  }
  pool = global._mysqlPool;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    // Return JS Date objects for TIMESTAMP columns
    dateStrings: false,
  });
}

export default pool;
