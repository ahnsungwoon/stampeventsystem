/**
 * MariaDB 스키마 초기화 스크립트
 * 실행: node scripts/init-db.js
 *
 * 사전 준비:
 *   CREATE DATABASE stamp_event CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 *   CREATE USER 'stamp_user'@'localhost' IDENTIFIED BY 'your_password';
 *   GRANT ALL ON stamp_event.* TO 'stamp_user'@'localhost';
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '175.196.64.249',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'sehwahs',
    password: process.env.DB_PASSWORD || 'StampEvent##0828',
    database: process.env.DB_NAME     || 'sehwahs',
    charset:  'utf8mb4',
  });

  console.log('📦 MariaDB 스키마 초기화 중...\n');

  // 데이터베이스 자체가 utf8mb4가 아니면(레거시 utf8/utf8mb3) 이모지 등 4바이트 문자가
  // 저장될 때 "Incorrect string value" 에러가 나므로 우선 utf8mb4로 맞춘다.
  const dbName = process.env.DB_NAME || 'sehwahs';
  await conn.query(`ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      phone            VARCHAR(255) UNIQUE NOT NULL,
      reward_claimed   TINYINT(1)  DEFAULT 0,
      reward_claimed_at DATETIME   NULL,
      created_at       DATETIME    DEFAULT NOW()
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS booths (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      club_name   VARCHAR(255) DEFAULT '',
      description TEXT,
      location    VARCHAR(255),
      floor       VARCHAR(10)  NOT NULL DEFAULT '1',
      icon        VARCHAR(16)  NOT NULL DEFAULT '',
      category    VARCHAR(50)  NOT NULL DEFAULT '',
      secret      VARCHAR(255) NOT NULL,
      display_key VARCHAR(64)  NOT NULL,
      image_url   VARCHAR(512) DEFAULT '',
      created_at  DATETIME DEFAULT NOW()
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  // 기존에 배포된 DB에는 floor/icon 컬럼이 없을 수 있으므로 안전하게 추가
  try {
    await conn.execute(`ALTER TABLE booths ADD COLUMN floor VARCHAR(10) NOT NULL DEFAULT '1' AFTER location`);
    console.log('  ↳ booths.floor 컬럼 추가됨');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await conn.execute(`ALTER TABLE booths ADD COLUMN icon VARCHAR(16) NOT NULL DEFAULT '' AFTER floor`);
    console.log('  ↳ booths.icon 컬럼 추가됨');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await conn.execute(`ALTER TABLE booths ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT '' AFTER icon`);
    console.log('  ↳ booths.category 컬럼 추가됨');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS stamps (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      booth_id     INT NOT NULL,
      collected_at DATETIME DEFAULT NOW(),
      UNIQUE KEY uq_user_booth (user_id, booth_id),
      FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
      FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS booth_visits (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      booth_id    INT NOT NULL,
      user_id     INT NOT NULL,
      scanned_at  DATETIME DEFAULT NOW(),
      INDEX idx_booth_scanned (booth_id, scanned_at),
      INDEX idx_scanned (scanned_at),
      FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`   VARCHAR(128) PRIMARY KEY,
      value  TEXT
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS performances (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      title       VARCHAR(255) NOT NULL,
      performer   VARCHAR(255) DEFAULT '',
      location    VARCHAR(255) DEFAULT '',
      start_time  VARCHAR(10)  NOT NULL,
      end_time    VARCHAR(10)  DEFAULT '',
      description TEXT,
      sort_order  INT DEFAULT 0,
      created_at  DATETIME DEFAULT NOW()
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS map_markers (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      label       VARCHAR(255) NOT NULL,
      description TEXT,
      x_pct       DOUBLE NOT NULL,
      y_pct       DOUBLE NOT NULL,
      booth_id    INT NULL,
      color       VARCHAR(32) DEFAULT '#6C3DE8',
      FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS access_codes (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      code          VARCHAR(32) UNIQUE NOT NULL,
      user_id       INT UNIQUE NULL,
      created_at    DATETIME DEFAULT NOW(),
      first_used_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notices (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      content    TEXT NOT NULL,
      is_active  TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT NOW()
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  // 기존에 이미 만들어져 있던 테이블이 utf8mb4가 아니면(레거시 DB) 변환
  const [tableRows] = await conn.query(
    `SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  for (const { TABLE_NAME, TABLE_COLLATION } of tableRows) {
    if (!TABLE_COLLATION || !TABLE_COLLATION.startsWith('utf8mb4')) {
      await conn.query(`ALTER TABLE \`${TABLE_NAME}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`  ↳ ${TABLE_NAME} 테이블을 utf8mb4로 변환함`);
    }
  }

  // 기본 설정 초기화
  const defaults = [
    ['event_name',          '학교 행사'],
    ['event_date',          ''],
    ['event_description',   ''],
    ['event_location',      ''],
    ['map_image',           ''],
    ['home_banner',         ''],
    ['logo_url',            ''],
    ['school_story',        ''],
    ['principal_message',   ''],
    ['principal_name',      '교장선생님'],
    ['performance_notice',  ''],
    ['announcement',        ''],
    ['announcement_active', '0'],
    ['receipt_subtitle',    '스탬프 투어 참가 코드'],
    ['receipt_notice',      '[주의] 본 코드를 잃어버리지 마세요. 상품 수령할 때 필요합니다.'],
    ['footer_org_name',     ''],
    ['footer_address',      ''],
    ['footer_contact',      ''],
    ['footer_extra',        ''],
    ['stamp_goal',          '6'],
  ];
  for (const [k, v] of defaults) {
    await conn.execute(
      'INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)',
      [k, v]
    );
  }

  console.log('✅ 스키마 초기화 완료');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
