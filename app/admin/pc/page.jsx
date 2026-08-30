'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── 영수증 렌더링 ───────────────────────────────────────────
// ESC/POS 프린터는 UTF-8 텍스트 모드를 지원하지 않는 경우가 많아
// 한글을 텍스트로 그대로 보내면 깨진다. 캔버스에 그린 뒤 흑백 비트맵
// (GS v 0 래스터 이미지)으로 전송하면 프린터의 폰트/코드페이지와
// 무관하게 어떤 ESC/POS 프린터에서도 동일하게 출력된다.

const RASTER_WIDTH = 576; // 80mm 용지 인쇄가능폭(72mm) @ 203dpi(8dot/mm), 8의 배수
const MARGIN_X      = 28;
const KOREAN_FONT    = "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif";
const CODE_FONT      = "'Consolas', 'D2Coding', monospace";
const DEFAULT_SUBTITLE = '스탬프 투어 참가 코드';
const DEFAULT_NOTICE   = '[주의] 본 코드를 잃어버리지 마세요. 상품 수령할 때 필요합니다.';

function wrapByChar(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawDashedLine(ctx, y) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(RASTER_WIDTH - MARGIN_X, y);
  ctx.stroke();
  ctx.restore();
}

function drawSpacedCode(ctx, code, cx, y, fontSize, pitch) {
  ctx.font = `800 ${fontSize}px ${CODE_FONT}`;
  ctx.textAlign = 'center';
  const totalWidth = pitch * (code.length - 1);
  let x = cx - totalWidth / 2;
  for (const ch of code) {
    ctx.fillText(ch, x, y);
    x += pitch;
  }
}

function formatIssuedAt(createdAt) {
  const d = createdAt ? new Date(createdAt) : new Date();
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// 코드 1건 → 티켓 캔버스 (내용 길이에 맞춰 세로 크기 자동 결정)
function renderTicketCanvas({ code, created_at }, event) {
  const MAX_HEIGHT = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = RASTER_WIDTH;
  canvas.height = MAX_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, RASTER_WIDTH, MAX_HEIGHT);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';

  const cx = RASTER_WIDTH / 2;
  let y = MARGIN_X + 34;

  // 행사명
  ctx.textAlign = 'center';
  ctx.font = `800 32px ${KOREAN_FONT}`;
  ctx.fillText(event.name, cx, y);

  // 부제 (여러 줄 가능)
  ctx.font = `600 18px ${KOREAN_FONT}`;
  for (const line of wrapByChar(ctx, event.subtitle, RASTER_WIDTH - MARGIN_X * 2)) {
    y += 26;
    ctx.fillText(line, cx, y);
  }

  y += 22;
  drawDashedLine(ctx, y);
  y += 34;

  // 일시 / 장소
  ctx.textAlign = 'left';
  const infoRows = [event.date && ['일시', event.date], event.location && ['장소', event.location]].filter(Boolean);
  for (const [label, value] of infoRows) {
    ctx.font = `700 19px ${KOREAN_FONT}`;
    ctx.fillText(label, MARGIN_X, y);
    ctx.font = `400 19px ${KOREAN_FONT}`;
    ctx.fillText(value, MARGIN_X + 60, y);
    y += 28;
  }
  if (infoRows.length > 0) {
    y += 8;
    drawDashedLine(ctx, y);
    y += 40;
  } else {
    y += 10;
  }

  // 접속 코드 (크게, 자간 넓게)
  const codeFontSize = code.length > 8 ? 44 : 56;
  const pitch = code.length > 8 ? 38 : 48;
  y += codeFontSize * 0.75;
  drawSpacedCode(ctx, code, cx, y, codeFontSize, pitch);
  y += codeFontSize * 0.25 + 26;

  // 발급 일시
  ctx.textAlign = 'center';
  ctx.font = `400 16px ${KOREAN_FONT}`;
  ctx.fillText(`발급: ${formatIssuedAt(created_at)}`, cx, y);
  y += 30;

  drawDashedLine(ctx, y);
  y += 34;

  // 주의 문구 (박스)
  ctx.font = `700 17px ${KOREAN_FONT}`;
  const warningLines = wrapByChar(ctx, event.notice, RASTER_WIDTH - MARGIN_X * 2 - 28);
  const boxTop = y;
  const lineHeight = 26;
  const boxPadding = 16;
  const boxHeight = warningLines.length * lineHeight + boxPadding * 2;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.strokeRect(MARGIN_X, boxTop, RASTER_WIDTH - MARGIN_X * 2, boxHeight);

  ctx.textAlign = 'center';
  let ly = boxTop + boxPadding + 16;
  for (const line of warningLines) {
    ctx.fillText(line, cx, ly);
    ly += lineHeight;
  }
  y = boxTop + boxHeight + MARGIN_X;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = RASTER_WIDTH;
  finalCanvas.height = Math.min(y, MAX_HEIGHT);
  finalCanvas.getContext('2d').drawImage(canvas, 0, 0);
  return finalCanvas;
}

// 캔버스(흑백) → ESC/POS 래스터 비트맵(GS v 0) 바이트 변환
function canvasToRaster(canvas) {
  const { width, height } = canvas;
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
  const bytesPerRow = width / 8; // RASTER_WIDTH는 8의 배수로 고정
  const raster = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (alpha > 128 && brightness < 200) {
        raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x % 8);
      }
    }
  }

  const xL = bytesPerRow & 0xff, xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff,      yH = (height >> 8) & 0xff;
  return new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH, ...raster]);
}

// 코드 목록 → ESC/POS 바이트 스트림 (초기화 + 가운데정렬 + 래스터이미지 + 커트, 코드별 반복)
async function buildESCPOSTickets(records, event) {
  if (document.fonts?.ready) await document.fonts.ready;
  const enc = new TextEncoder();
  const chunks = [];

  for (const record of records) {
    const raster = canvasToRaster(renderTicketCanvas(record, event));
    chunks.push(enc.encode('\x1B\x40\x1B\x61\x01'));          // 초기화 + 가운데 정렬
    chunks.push(raster);
    chunks.push(enc.encode('\x1B\x64\x04\x1D\x56\x41\x00'));  // 4줄 피드 + 커트
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function printViaSerial(records, event) {
  if (!('serial' in navigator)) return false;
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(await buildESCPOSTickets(records, event));
    writer.releaseLock();
    await port.close();
    return true;
  } catch {
    return false;
  }
}

function printViaBrowser(records, event) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; margin: 0; }
  .ticket { width: 72mm; margin: 0 auto; padding: 5mm 4mm; box-sizing: border-box; text-align: center; page-break-after: always; }
  .event { font-size: 15px; font-weight: 800; margin-bottom: 2mm; }
  .sub { font-size: 10px; color: #555; margin-bottom: 3mm; }
  .divider { border-top: 1.5px dashed #999; margin: 3mm 0; }
  .info { text-align: left; font-size: 11px; margin: 1.5mm 0; }
  .info b { display: inline-block; width: 30px; }
  .code { font-size: 30px; font-weight: 800; letter-spacing: 5px; margin: 4mm 0; font-family: 'Consolas', monospace; }
  .issued { font-size: 10px; color: #555; margin-bottom: 2mm; }
  .warn { border: 1.5px solid #000; border-radius: 4px; padding: 3mm; font-size: 11px; font-weight: 700; margin-top: 3mm; line-height: 1.5; }
</style></head><body>
${records.map(r => `
  <div class="ticket">
    <div class="event">${event.name}</div>
    <div class="sub">${event.subtitle}</div>
    <div class="divider"></div>
    ${event.date     ? `<div class="info"><b>일시</b>${event.date}</div>` : ''}
    ${event.location ? `<div class="info"><b>장소</b>${event.location}</div>` : ''}
    <div class="divider"></div>
    <div class="code">${r.code}</div>
    <div class="issued">발급: ${formatIssuedAt(r.created_at)}</div>
    <div class="divider"></div>
    <div class="warn">${event.notice}</div>
  </div>
`).join('')}
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(html);
  w.document.close();
}

// ─── 로그인 ───────────────────────────────────────────────
function PCLogin({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error); return; }
      onLogin(d.token);
    } catch { setErr('서버에 연결할 수 없습니다.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7EEDD' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 8px 40px rgba(181,101,29,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem' }}>🔐</div>
          <h2 style={{ color: '#B5651D', marginTop: 8 }}>어드민 PC</h2>
        </div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#7A6E5D', marginBottom: 6 }}>관리자 비밀번호</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '12px 14px', border: '2px solid #E8DFCF', borderRadius: 10, fontSize: '1rem', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
        />
        {err && <p style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: 10 }}>{err}</p>}
        <button
          onClick={login} disabled={loading}
          style={{ width: '100%', padding: 14, background: '#B5651D', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );
}

// ─── 접속 코드 관리 ──────────────────────────────────────────
function CodesSection({ token, settings }) {
  const [codes, setCodes] = useState([]);
  const [genCount, setGenCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [searchCode, setSearchCode] = useState('');

  const aheaders = { 'Content-Type': 'application/json', Authorization: `AdminBearer ${token}` };

  async function load() {
    const res = await fetch('/api/admin/codes', { headers: aheaders });
    setCodes(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setLoading(true);
    await fetch('/api/admin/codes', { method: 'POST', headers: aheaders, body: JSON.stringify({ count: genCount }) });
    await load();
    setLoading(false);
  }

  async function deleteUnused() {
    if (!confirm('미사용 코드를 모두 삭제할까요?')) return;
    await fetch('/api/admin/codes', { method: 'DELETE', headers: aheaders, body: JSON.stringify({ deleteAll: true }) });
    await load();
  }

  async function deleteCode(c) {
    const usedWarning = c.user_id ? '\n\n⚠️ 이미 사용된 코드입니다. 삭제하면 참가자가 이 코드로 다시 로그인할 수 없게 됩니다. (모은 스탬프 기록 자체는 삭제되지 않습니다)' : '';
    if (!confirm(`"${c.code}" 코드를 삭제할까요?${usedWarning}`)) return;
    if (!confirm('정말로 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    await fetch('/api/admin/codes', { method: 'DELETE', headers: aheaders, body: JSON.stringify({ id: c.id }) });
    await load();
  }

  async function handlePrint(records) {
    if (records.length === 0) return;
    const event = {
      name:     settings?.event_name       || '학교 행사',
      date:     settings?.event_date       || '',
      location: settings?.event_location   || '',
      subtitle: settings?.receipt_subtitle || DEFAULT_SUBTITLE,
      notice:   settings?.receipt_notice   || DEFAULT_NOTICE,
    };
    const ok = await printViaSerial(records, event);
    if (!ok) printViaBrowser(records, event);
  }

  function toggleSelect(code) {
    setSelected(s => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  }

  function selectAllUnused() {
    const unused = filtered.filter(c => !c.user_id).map(c => c.code);
    setSelected(new Set(unused));
  }

  const filtered = codes.filter(c => {
    if (filter === 'unused') return !c.user_id;
    if (filter === 'used') return !!c.user_id;
    return true;
  }).filter(c => !searchCode || c.code.includes(searchCode.toUpperCase()));

  const unusedCount = codes.filter(c => !c.user_id).length;
  const usedCount = codes.filter(c => !!c.user_id).length;

  return (
    <div>
      <h2 style={sectionTitle}>접속 코드 관리</h2>

      {/* 생성 */}
      <div style={card}>
        <h3 style={cardTitle}>코드 생성</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1} max={500}
              value={genCount}
              onChange={e => setGenCount(parseInt(e.target.value) || 1)}
              style={inputSm}
            />
            <span style={{ fontSize: '0.9rem', color: '#7A6E5D' }}>개 생성</span>
          </div>
          <button onClick={generate} disabled={loading} style={btnPrimary}>
            {loading ? '생성 중...' : '🎫 코드 생성'}
          </button>
          <button onClick={deleteUnused} style={{ ...btnDanger, marginLeft: 'auto' }}>
            🗑️ 미사용 삭제
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#7A6E5D' }}>
          전체 {codes.length}개 · 미사용 {unusedCount}개 · 사용됨 {usedCount}개
        </div>
      </div>

      {/* 선택 인쇄 */}
      {selected.size > 0 && (
        <div style={{ ...card, background: '#F0E4CC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#B5651D' }}>{selected.size}개 선택됨</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handlePrint(codes.filter(c => selected.has(c.code)))} style={btnPrimary}>🖨️ 인쇄</button>
            <button onClick={() => setSelected(new Set())} style={btnOutline}>취소</button>
          </div>
        </div>
      )}

      {/* 필터 + 검색 */}
      <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['all', '전체'], ['unused', '미사용'], ['used', '사용됨']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: '0.85rem', cursor: 'pointer',
              background: filter === v ? '#B5651D' : '#F0E4CC', color: filter === v ? '#fff' : '#B5651D', fontWeight: 600 }}>
            {l}
          </button>
        ))}
        <input
          placeholder="코드 검색..."
          value={searchCode}
          onChange={e => setSearchCode(e.target.value)}
          style={{ ...inputSm, marginLeft: 'auto', width: 140 }}
        />
        <button onClick={selectAllUnused} style={btnOutline}>미사용 전체 선택</button>
        {filtered.length > 0 && (
          <button onClick={() => handlePrint(filtered.filter(c => !c.user_id))} style={btnPrimary}>
            🖨️ 미사용 전체 인쇄
          </button>
        )}
      </div>

      {/* 코드 테이블 */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E8DFCF' }}>
              <th style={th}><input type="checkbox" onChange={e => e.target.checked ? setSelected(new Set(filtered.map(c => c.code))) : setSelected(new Set())} /></th>
              <th style={th}>코드</th>
              <th style={th}>상태</th>
              <th style={th}>최초 사용</th>
              <th style={th}>액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #F2EAD9', background: selected.has(c.code) ? '#F7EEDD' : 'transparent' }}>
                <td style={td}><input type="checkbox" checked={selected.has(c.code)} onChange={() => toggleSelect(c.code)} /></td>
                <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '2px', color: '#B5651D' }}>{c.code}</td>
                <td style={td}>
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 600,
                    background: c.user_id ? '#DCFCE7' : '#F2EAD9', color: c.user_id ? '#166534' : '#7A6E5D' }}>
                    {c.user_id ? '✅ 사용됨' : '⬜ 미사용'}
                  </span>
                </td>
                <td style={{ ...td, color: '#7A6E5D', fontSize: '0.8rem' }}>
                  {c.first_used_at ? new Date(c.first_used_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  {!c.user_id && (
                    <button onClick={() => handlePrint([c])} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '0.78rem' }}>
                      🖨️ 인쇄
                    </button>
                  )}
                  <button onClick={() => deleteCode(c)} style={{ ...btnDanger, padding: '4px 10px', fontSize: '0.78rem' }}>
                    🗑️ 삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px 0', color: '#7A6E5D' }}>코드가 없습니다. 먼저 생성하세요.</p>
        )}
      </div>

      <div style={{ ...card, background: '#FFF7ED', fontSize: '0.82rem', color: '#92400E' }}>
        💡 <strong>ESC/POS 프린터 사용:</strong> Chrome/Edge에서만 지원됩니다. 인쇄 버튼 클릭 시 포트를 선택하세요.
        다른 브라우저에서는 자동으로 일반 인쇄 창이 열립니다.
      </div>
    </div>
  );
}

// ─── 완주 현황 ────────────────────────────────────────────
function CompletionsSection({ token }) {
  const [data, setData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const aheaders = { Authorization: `AdminBearer ${token}` };

  useEffect(() => {
    fetch('/api/admin/completions', { headers: aheaders })
      .then(r => r.json()).then(setData);
  }, []);

  async function verify() {
    if (!verifyCode.trim()) return;
    const res = await fetch('/api/admin/completions', {
      method: 'POST',
      headers: { ...aheaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: verifyCode }),
    });
    setVerifyResult(await res.json());
  }

  return (
    <div>
      <h2 style={sectionTitle}>완주 현황</h2>

      {/* 코드 인증 */}
      <div style={card}>
        <h3 style={cardTitle}>코드 인증</h3>
        <p style={{ fontSize: '0.85rem', color: '#7A6E5D', marginBottom: 12 }}>
          참여자의 접속 코드를 입력하면 스탬프 현황을 확인합니다.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="접속 코드 입력 (예: A3KN7M)"
            value={verifyCode}
            onChange={e => setVerifyCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && verify()}
            style={{ ...inputSm, flex: 1, letterSpacing: '3px', fontWeight: 700, fontSize: '1.1rem' }}
          />
          <button onClick={verify} style={btnPrimary}>확인</button>
        </div>

        {verifyResult && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 10,
            background: !verifyResult.valid ? '#FEE2E2' : verifyResult.completed ? '#DCFCE7' : '#FFF7ED',
            border: `2px solid ${!verifyResult.valid ? '#EF4444' : verifyResult.completed ? '#22C55E' : '#F59E0B'}` }}>
            {!verifyResult.valid ? (
              <p style={{ color: '#991B1B', fontWeight: 600 }}>❌ {verifyResult.error}</p>
            ) : !verifyResult.used ? (
              <p style={{ color: '#92400E', fontWeight: 600 }}>⬜ 미사용 코드입니다.</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700, color: '#B5651D' }}>{verifyResult.code}</span>
                  {verifyResult.completed ? (
                    <span style={{ background: '#22C55E', color: '#fff', padding: '4px 14px', borderRadius: 100, fontWeight: 700, fontSize: '0.9rem' }}>
                      ✅ 스탬프 완성!
                    </span>
                  ) : (
                    <span style={{ background: '#F59E0B', color: '#fff', padding: '4px 14px', borderRadius: 100, fontWeight: 700, fontSize: '0.9rem' }}>
                      {verifyResult.stampCount} / {verifyResult.goal} 수집 중
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {verifyResult.stamps?.map(s => (
                    <span key={s.booth_id} style={{ background: '#F0E4CC', color: '#B5651D', padding: '3px 10px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600 }}>
                      ✓ {s.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 완주자 목록 */}
      <div style={card}>
        <h3 style={cardTitle}>완주자 목록 ({data?.completers?.length ?? 0}명)</h3>
        {!data ? (
          <p style={{ color: '#7A6E5D' }}>불러오는 중...</p>
        ) : data.completers.length === 0 ? (
          <p style={{ color: '#7A6E5D' }}>아직 완주자가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8DFCF' }}>
                <th style={th}>접속 코드</th>
                <th style={th}>스탬프 수</th>
                <th style={th}>마지막 수집</th>
                <th style={th}>첫 접속</th>
              </tr>
            </thead>
            <tbody>
              {data.completers.map(c => (
                <tr key={c.user_id} style={{ borderBottom: '1px solid #F2EAD9' }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#B5651D', letterSpacing: '2px' }}>{c.code}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 10px', borderRadius: 100, fontSize: '0.82rem', fontWeight: 700 }}>
                      {c.stamp_count} / {data.goal}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#7A6E5D', fontSize: '0.8rem' }}>
                    {new Date(c.last_stamp_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ ...td, color: '#7A6E5D', fontSize: '0.8rem' }}>
                    {c.first_used_at ? new Date(c.first_used_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── 방문자 통계 ─────────────────────────────────────────
function formatHourLabel(hour) {
  const [date, time] = hour.split(' ');
  const [, m, d] = date.split('-');
  const hh = time.split(':')[0];
  return `${parseInt(m, 10)}/${parseInt(d, 10)} ${hh}시`;
}

function downloadCSV(filename, header, rows) {
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function csvField(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 12px rgba(181,101,29,0.08)' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#7A6E5D', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#9C8F7A', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HourBarList({ items, valueKey, color, emptyMsg }) {
  const max = Math.max(1, ...items.map(x => x[valueKey]));
  if (items.length === 0) return <p style={{ color: '#7A6E5D', fontSize: '0.85rem' }}>{emptyMsg}</p>;
  return (
    <div>
      {items.map(h => (
        <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 90, flexShrink: 0, fontSize: '0.8rem', color: '#7A6E5D' }}>{formatHourLabel(h.hour)}</span>
          <div style={{ flex: 1, background: '#F2EAD9', borderRadius: 6, height: 18 }}>
            <div style={{ width: `${(h[valueKey] / max) * 100}%`, background: color, height: '100%', borderRadius: 6 }} />
          </div>
          <span style={{ width: 36, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700 }}>{h[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function BoothDetailPanel({ boothId, token, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error,  setError]  = useState('');
  const aheaders = { Authorization: `AdminBearer ${token}` };

  useEffect(() => {
    setDetail(null);
    setError('');
    fetch(`/api/admin/visits/${boothId}`, { headers: aheaders })
      .then(async r => {
        if (!r.ok) throw new Error(`서버 응답 오류 (${r.status})`);
        return r.json();
      })
      .then(setDetail)
      .catch(e => setError(e.message || '불러오지 못했습니다.'));
  }, [boothId]);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid #F2EAD9' }}>
      {error ? (
        <p style={{ color: 'var(--danger, #EF4444)' }}>⚠️ {error} (서버를 최신 버전으로 재배포했는지 확인해 주세요)</p>
      ) : !detail ? (
        <p style={{ color: '#7A6E5D' }}>불러오는 중...</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ ...cardTitle, margin: 0 }}>📍 {detail.booth.name} 상세</h4>
            <button onClick={onClose} style={{ ...btnOutline, padding: '4px 12px', fontSize: '0.78rem' }}>닫기 ✕</button>
          </div>
          <div style={{ display: 'flex', gap: 28, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B5651D' }}>{detail.totalVisits.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: '#7A6E5D' }}>총 방문(QR 스캔) 수</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0EA5E9' }}>{detail.uniqueVisitors.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: '#7A6E5D' }}>총 방문자 수 (순)</div>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#241C14', marginBottom: 10 }}>1시간 간격 방문 추이</p>
          <HourBarList items={detail.byHour} valueKey="visits" color="#0EA5E9" emptyMsg="아직 방문 기록이 없습니다." />
        </>
      )}
    </div>
  );
}

function VisitsSection({ token }) {
  const [data, setData] = useState(null);
  const [detailBoothId, setDetailBoothId] = useState(null);
  const aheaders = { Authorization: `AdminBearer ${token}` };

  useEffect(() => {
    fetch('/api/admin/visits', { headers: aheaders }).then(r => r.json()).then(setData);
  }, []);

  if (!data) return <p style={{ color: '#7A6E5D' }}>불러오는 중...</p>;

  const maxBoothVisits = Math.max(1, ...data.byBooth.map(b => b.visits));
  const codeUsageRate  = data.codesIssued ? Math.round((data.codesUsed / data.codesIssued) * 100) : 0;

  function exportBoothReport() {
    const header = 'booth_id,name,club_name,visits,unique_visitors';
    const rows = data.byBooth.map(b => [b.id, b.name, b.club_name, b.visits, b.uniqueVisitors].map(csvField).join(','));
    downloadCSV('부스별_방문자_통계.csv', header, rows);
  }

  function exportHourReport() {
    const header = 'hour,visits,unique_visitors';
    const rows = data.byHour.map(h => [h.hour, h.visits, h.uniqueVisitors].map(csvField).join(','));
    downloadCSV('시간대별_방문자_통계.csv', header, rows);
  }

  function exportRegistrationReport() {
    const header = 'hour,registrations';
    const rows = data.registrationsByHour.map(h => [h.hour, h.registrations].map(csvField).join(','));
    downloadCSV('행사_참여_시간대별_등록_통계.csv', header, rows);
  }

  async function resetVisitStats() {
    if (!confirm('방문자(QR 스캔) 통계를 초기화할까요?\n\n부스별/시간대별 방문 기록이 모두 삭제됩니다.\n(스탬프 적립 기록, 접속 코드, 참여자 정보는 영향받지 않습니다)')) return;
    if (!confirm('정말로 초기화할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    await fetch('/api/admin/visits', { method: 'DELETE', headers: aheaders });
    setDetailBoothId(null);
    fetch('/api/admin/visits', { headers: aheaders }).then(r => r.json()).then(setData);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={sectionTitle}>방문자 통계</h2>
        <button onClick={resetVisitStats} style={{ ...btnDanger, marginBottom: 16 }}>🗑️ 통계 초기화</button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="총 QR 스캔 수 (방문 횟수)" value={data.totalVisits.toLocaleString()} color="#B5651D" />
        <StatCard label="순 방문자 수" value={data.uniqueVisitors.toLocaleString()} color="#0EA5E9" />
        <StatCard label="축제 참여 인원" value={data.participants.toLocaleString()} sub="코드 발급받고 로그인한 사용자 수" color="#10B981" />
        <StatCard label="코드 사용률" value={`${codeUsageRate}%`} sub={`${data.codesUsed} / ${data.codesIssued}개 사용됨`} color="#8B5CF6" />
      </div>

      {/* 행사 전체 참여 보고서 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={cardTitle}>행사 전체 참여 보고서</h3>
          <button onClick={exportRegistrationReport} style={btnOutline}>⬇️ CSV 다운로드</button>
        </div>

        <div style={{ display: 'flex', gap: 32, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{data.participants.toLocaleString()}명</div>
            <div style={{ fontSize: '0.78rem', color: '#7A6E5D' }}>코드 등록(로그인) 인원</div>
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#B5651D' }}>
              {data.stampedUsers.toLocaleString()}명 <span style={{ fontSize: '1rem', color: '#9C8F7A', fontWeight: 700 }}>({data.stampedRate}%)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#7A6E5D' }}>스탬프를 1개 이상 방문한 인원</div>
          </div>
        </div>
        <div style={{ height: 10, background: '#F2EAD9', borderRadius: 100, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ width: `${data.stampedRate}%`, height: '100%', background: 'linear-gradient(90deg, #B5651D, #D98C4A)' }} />
        </div>

        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#241C14', marginBottom: 10 }}>시간대별 코드 등록 인원</p>
        <HourBarList items={data.registrationsByHour} valueKey="registrations" color="#10B981" emptyMsg="아직 등록(로그인) 기록이 없습니다." />
      </div>

      {/* 부스별 방문자 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={cardTitle}>부스별 방문자 통계 (전체 방문자 보고서)</h3>
          <button onClick={exportBoothReport} style={btnOutline}>⬇️ CSV 다운로드</button>
        </div>
        {data.byBooth.length === 0 ? (
          <p style={{ color: '#7A6E5D' }}>등록된 부스가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8DFCF' }}>
                <th style={th}>부스</th>
                <th style={th}>동아리</th>
                <th style={{ ...th, width: '30%' }}>QR 스캔 수 (방문 횟수)</th>
                <th style={th}>순 방문자 수</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.byBooth.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #F2EAD9', background: detailBoothId === b.id ? '#FFF7ED' : 'transparent' }}>
                  <td style={{ ...td, fontWeight: 700 }}>{b.name}</td>
                  <td style={{ ...td, color: '#7A6E5D', fontSize: '0.82rem' }}>{b.club_name || '-'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, background: '#F2EAD9', borderRadius: 6, height: 16 }}>
                        <div style={{ width: `${(b.visits / maxBoothVisits) * 100}%`, background: '#B5651D', height: '100%', borderRadius: 6 }} />
                      </div>
                      <span style={{ width: 32, textAlign: 'right', fontWeight: 700 }}>{b.visits}</span>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{b.uniqueVisitors}</td>
                  <td style={td}>
                    <button
                      onClick={() => setDetailBoothId(id => id === b.id ? null : b.id)}
                      style={{ ...btnOutline, padding: '4px 12px', fontSize: '0.78rem' }}
                    >
                      {detailBoothId === b.id ? '접기' : '상세보기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {detailBoothId && (
          <BoothDetailPanel boothId={detailBoothId} token={token} onClose={() => setDetailBoothId(null)} />
        )}
      </div>

      {/* 시간대별 방문자 (전체) */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={cardTitle}>시간대별 방문자 통계 (전체 부스 합산)</h3>
          <button onClick={exportHourReport} style={btnOutline}>⬇️ CSV 다운로드</button>
        </div>
        <HourBarList items={data.byHour} valueKey="visits" color="#B5651D" emptyMsg="아직 QR 스캔 기록이 없습니다." />
      </div>
    </div>
  );
}

// ─── 행사 설정 (PC) ──────────────────────────────────────
function SettingsSection({ token, onSettingsChange }) {
  const [form, setForm] = useState({
    event_name: '', event_date: '', event_location: '', event_description: '',
    receipt_subtitle: '', receipt_notice: '',
  });
  const [saved, setSaved] = useState(false);
  const aheaders = { 'Content-Type': 'application/json', Authorization: `AdminBearer ${token}` };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setForm(f => ({ ...f, ...s })));
  }, []);

  async function save() {
    await fetch('/api/settings', { method: 'PUT', headers: aheaders, body: JSON.stringify(form) });
    setSaved(true);
    onSettingsChange(form);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <h2 style={sectionTitle}>행사 기본 정보</h2>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>행사 이름</label>
            <input value={form.event_name} onChange={e => set('event_name', e.target.value)} style={inputFull} placeholder="예: 2025 과학 문화제" />
          </div>
          <div>
            <label style={labelStyle}>날짜/기간</label>
            <input value={form.event_date} onChange={e => set('event_date', e.target.value)} style={inputFull} placeholder="예: 2025년 6월 20일" />
          </div>
          <div>
            <label style={labelStyle}>장소</label>
            <input value={form.event_location} onChange={e => set('event_location', e.target.value)} style={inputFull} placeholder="예: ○○고등학교" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>행사 소개</label>
          <textarea value={form.event_description} onChange={e => set('event_description', e.target.value)}
            style={{ ...inputFull, resize: 'vertical', height: 80, fontFamily: 'inherit' }} placeholder="행사 소개문" />
        </div>
      </div>

      <h2 style={sectionTitle}>🖨️ 접속 코드 인쇄 문구</h2>
      <div style={card}>
        <p style={{ fontSize: '0.82rem', color: '#7A6E5D', marginBottom: 16, lineHeight: 1.6 }}>
          접속 코드 인쇄 시 행사명·일시·장소·코드 아래에 표시되는 부제와, 맨 아래 주의 문구를 직접 수정할 수 있습니다.
          비워두면 기본 문구가 사용됩니다.
        </p>
        <div>
          <label style={labelStyle}>부제</label>
          <input value={form.receipt_subtitle} onChange={e => set('receipt_subtitle', e.target.value)}
            style={inputFull} placeholder={DEFAULT_SUBTITLE} />
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>주의 문구</label>
          <textarea value={form.receipt_notice} onChange={e => set('receipt_notice', e.target.value)}
            style={{ ...inputFull, resize: 'vertical', height: 60, fontFamily: 'inherit' }} placeholder={DEFAULT_NOTICE} />
        </div>
      </div>

      <button onClick={save} style={btnPrimary}>{saved ? '✅ 저장됨' : '저장'}</button>
    </div>
  );
}

// ─── 공통 스타일 ─────────────────────────────────────────
const sectionTitle = { fontSize: '1.1rem', fontWeight: 700, color: '#B5651D', marginBottom: 16 };
const card = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(181,101,29,0.08)', marginBottom: 16 };
const cardTitle = { fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: '#241C14' };
const btnPrimary = { padding: '8px 18px', background: '#B5651D', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' };
const btnOutline = { padding: '8px 18px', background: 'transparent', color: '#B5651D', border: '2px solid #B5651D', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' };
const btnDanger = { padding: '8px 18px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' };
const inputSm = { padding: '8px 12px', border: '2px solid #E8DFCF', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: 80, boxSizing: 'border-box' };
const inputFull = { width: '100%', padding: '10px 14px', border: '2px solid #E8DFCF', borderRadius: 10, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', display: 'block' };
const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#7A6E5D', marginBottom: 6 };
const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#7A6E5D', fontSize: '0.82rem' };
const td = { padding: '10px 12px', verticalAlign: 'middle' };

const NAV_ITEMS = [
  { id: 'codes',       label: '🎫 접속 코드' },
  { id: 'completions', label: '🏆 완주 현황' },
  { id: 'visits',      label: '📊 방문자 통계' },
  { id: 'settings',    label: '⚙️ 행사 설정' },
];

// ─── 메인 ────────────────────────────────────────────────
export default function AdminPCPage() {
  const [token, setToken] = useState(null);
  const [section, setSection] = useState('codes');
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, []);

  function onLogin(t) {
    sessionStorage.setItem('admin_token', t);
    setToken(t);
  }

  function logout() {
    sessionStorage.removeItem('admin_token');
    setToken(null);
  }

  if (!token) return <PCLogin onLogin={onLogin} />;

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* 사이드바 */}
      <aside style={{ width: 200, background: '#241C14', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>어드민 PC</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{settings.event_name || '학교 행사'}</div>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                display: 'block', width: '100%', padding: '12px 20px', border: 'none', textAlign: 'left',
                background: section === item.id ? 'rgba(181,101,29,0.4)' : 'transparent',
                color: section === item.id ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: '0.9rem', fontWeight: section === item.id ? 600 : 400,
                cursor: 'pointer', borderLeft: section === item.id ? '3px solid #A78BFA' : '3px solid transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/admin" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textDecoration: 'none', marginBottom: 8 }}>
            📱 모바일 어드민
          </a>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 본문 */}
      <main style={{ flex: 1, background: '#F7EEDD', padding: 28, overflowY: 'auto' }}>
        {section === 'codes'       && <CodesSection       token={token} settings={settings} />}
        {section === 'completions' && <CompletionsSection token={token} />}
        {section === 'visits'      && <VisitsSection      token={token} />}
        {section === 'settings'    && <SettingsSection    token={token} onSettingsChange={setSettings} />}
      </main>
    </div>
  );
}
