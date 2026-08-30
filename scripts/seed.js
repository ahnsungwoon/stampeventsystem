/**
 * 부스 초기 데이터 생성 스크립트 (MariaDB)
 * 실행: node scripts/seed.js
 */
require('dotenv').config();
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const BOOTHS = [
  { name: '과학 실험 부스', club_name: '물리화학반', description: '신기한 물리·화학 실험 체험', location: '3층 과학실' },
  { name: '수학 퀴즈 부스', club_name: '수학반', description: '두뇌를 깨우는 수학 퀴즈', location: '2층 수학실' },
  { name: '역사 체험 부스', club_name: '역사반', description: '조선시대 유물 전시 및 퀴즈', location: '1층 역사실' },
  { name: '미술 공방 부스', club_name: '미술반', description: '나만의 작품 만들기', location: '4층 미술실' },
  { name: '음악 공연 부스', club_name: '음악반', description: '학생 밴드 공연 & 악기 체험', location: '강당' },
  { name: '브롤스타즈 승부예측', club_name: '인공신경망제작연구반', description: '브롤스타즈 3대3 경기 승부 예측 프로그램', location: 'Data Space' },
];

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'stamp_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'stamp_event',
    charset:  'utf8mb4',
  });

  await conn.execute('DELETE FROM stamps');
  await conn.execute('DELETE FROM booths');
  await conn.execute('ALTER TABLE booths AUTO_INCREMENT = 1');

  console.log('\n📋 부스 초기화 완료\n');
  console.log('─'.repeat(60));

  for (const booth of BOOTHS) {
    const secret      = crypto.randomBytes(32).toString('hex');
    const display_key = crypto.randomBytes(6).toString('hex');

    const [result] = await conn.execute(
      'INSERT INTO booths (name, club_name, description, location, secret, display_key) VALUES (?, ?, ?, ?, ?, ?)',
      [booth.name, booth.club_name, booth.description, booth.location, secret, display_key]
    );
    const id = result.insertId;

    const host = `http://localhost:${process.env.PORT || 3000}`;
    console.log(`[부스 ${id}] ${booth.name} (${booth.club_name})`);
    console.log(`  위치     : ${booth.location}`);
    console.log(`  접속 URL : ${host}/booth?id=${id}&key=${display_key}`);
    console.log('─'.repeat(60));
  }

  console.log('\n⚠️  display_key는 부스 운영자에게만 전달하세요.\n');
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
