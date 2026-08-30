const mysql = require('mysql2/promise');

if (!global._pool) {
  global._pool = mysql.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    port:             Number(process.env.DB_PORT) || 3306,
    user:             process.env.DB_USER     || 'stamp_user',
    password:         process.env.DB_PASSWORD || '',
    database:         process.env.DB_NAME     || 'stamp_event',
    waitForConnections: true,
    connectionLimit:  10,
    queueLimit:       0,
    charset:          'utf8mb4',
    timezone:         '+00:00',
    decimalNumbers:   true,
    enableKeepAlive:  true,
    keepAliveInitialDelay: 10000,
    connectTimeout:   10000,
  });
}

module.exports = global._pool;
