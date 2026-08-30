import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { FLOOR_VALUES } from '@/lib/floors';
import { PARTNER_CATEGORY } from '@/lib/categories';

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result.map(v => v.trim());
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/﻿/, '')); // strip BOM
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

// GET: 현재 부스 목록을 CSV로 다운로드
export async function GET(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const [booths] = await db.execute(
    'SELECT id, name, club_name, location, floor, icon, category, description FROM booths ORDER BY id'
  );
  const header = 'id,name,club_name,location,floor,icon,category,description';
  const rows = booths.map(b =>
    [b.id, b.name, b.club_name, b.location, b.floor, b.icon, b.category, b.description]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header, ...rows].join('\n');

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="booths.csv"',
    },
  });
}

// POST: CSV 업로드로 부스 동기화
export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('csv');
  if (!file) return NextResponse.json({ error: 'CSV 파일이 없습니다.' }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: 'CSV 데이터가 없습니다.' }, { status: 400 });

  const results = await Promise.all(rows.map(async row => {
    const name      = (row['name']      || row['부스명']  || '').trim();
    const club_name = (row['club_name'] || row['동아리명'] || '').trim();
    const location  = (row['location']  || row['위치']   || '').trim();
    const desc      = (row['description'] || row['설명']  || '').trim();
    const rawFloor  = (row['floor']     || row['층']     || '').trim();
    const floor     = FLOOR_VALUES.includes(rawFloor) ? rawFloor : '1';
    const icon      = (row['icon']      || row['이모지'] || '').trim().slice(0, 8);
    const rawCategory = (row['category'] || row['카테고리'] || '').trim();
    const category  = rawCategory === PARTNER_CATEGORY ? PARTNER_CATEGORY : '';
    const rawId     = (row['id']        || '').trim();

    if (!name) return null;

    if (rawId) {
      // 기존 부스 업데이트
      await db.execute(
        'UPDATE booths SET name=?, club_name=?, location=?, floor=?, icon=?, category=?, description=? WHERE id=?',
        [name, club_name, location, floor, icon, category, desc, rawId]
      );
      return { type: 'updated', id: Number(rawId), name };
    } else {
      // 새 부스 생성
      const secret      = crypto.randomBytes(32).toString('hex');
      const display_key = crypto.randomBytes(6).toString('hex');
      const [result] = await db.execute(
        'INSERT INTO booths (name, club_name, description, location, floor, icon, category, secret, display_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, club_name, desc, location, floor, icon, category, secret, display_key]
      );
      return { type: 'created', id: result.insertId, name, display_key };
    }
  }));

  const created = results.filter(r => r?.type === 'created').map(({ type, ...r }) => r);
  const updated = results.filter(r => r?.type === 'updated').map(({ type, ...r }) => r);

  return NextResponse.json({ ok: true, created, updated });
}
