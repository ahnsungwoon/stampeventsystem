'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from './_components/Footer';

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [booths, setBooths]     = useState([]);
  const [perfs, setPerfs]       = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [stampToken, setStampToken]     = useState(null);
  const [stampCode, setStampCode]       = useState('');
  const [stampData, setStampData]       = useState(null);
  const [codeInput, setCodeInput]       = useState('');
  const [stampLoading, setStampLoading] = useState(false);
  const [stampMsg, setStampMsg]         = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/booth').then(r => r.json()),
      fetch('/api/performances').then(r => r.json()),
    ]).then(([s, b, p]) => { setSettings(s); setBooths(b); setPerfs(p); }).catch(() => {}).finally(() => setLoaded(true));

    const tok  = localStorage.getItem('stamp_token');
    const code = localStorage.getItem('stamp_code');
    if (tok) { setStampToken(tok); setStampCode(code || ''); fetchStampData(tok); }
  }, []);

  async function fetchStampData(tok) {
    try {
      const res = await fetch('/api/stamps/my', { headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) { doLogout(); return; }
      setStampData(await res.json());
    } catch {}
  }

  async function handleLogin() {
    if (!codeInput.trim()) { setStampMsg('접속 코드를 입력해 주세요.'); return; }
    setStampLoading(true); setStampMsg('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) { setStampMsg(data.error); return; }
      localStorage.setItem('stamp_token', data.token);
      localStorage.setItem('stamp_code',  data.code);
      setStampToken(data.token); setStampCode(data.code); setCodeInput('');
      await fetchStampData(data.token);
    } catch { setStampMsg('서버에 연결할 수 없습니다.'); }
    finally { setStampLoading(false); }
  }

  function doLogout() {
    localStorage.removeItem('stamp_token'); localStorage.removeItem('stamp_code');
    setStampToken(null); setStampData(null); setStampCode('');
  }

  const collected = stampData?.collected ?? 0;
  const total     = stampData?.total     ?? 0;
  const goal      = stampData?.goal      ?? 0;
  const pct       = goal ? Math.round((Math.min(collected, goal) / goal) * 100) : 0;

  if (!loaded) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F1E6' }}>
        <div style={{ textAlign: 'center', color: '#9C8F7A' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: '0.9rem' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .home-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; padding:10px 0 18px; text-decoration:none; gap:4px; border:none; background:none; cursor:pointer; font-family:inherit; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#F7F1E6', paddingBottom: 80 }}>

        {/* ── 히어로 배너 ─────────────────────────────── */}
        <div style={{
          background: settings.home_banner
            ? `linear-gradient(to bottom, rgba(36,28,20,0.55) 0%, rgba(36,28,20,0.75) 100%), url(${settings.home_banner}) center/cover`
            : 'linear-gradient(145deg, #241C14 0%, #B5651D 45%, #D98C4A 100%)',
          padding: '56px 24px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 장식 원 */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 20, right: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            {settings.logo_url && (
              <img src={settings.logo_url} alt="로고" style={{ height: 30, marginBottom: 16, display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
            )}

            {/* 배지 */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 100, padding: '5px 14px', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 14, border: '1px solid rgba(255,255,255,0.2)' }}>
              🎉 학교 행사 안내
            </div>

            <h1 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 7vw, 2rem)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 12px', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              {settings.event_name || '학교 행사'}
            </h1>

            {(settings.event_date || settings.event_location) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {settings.event_date && (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📅 {settings.event_date}
                  </span>
                )}
                {settings.event_location && (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📍 {settings.event_location}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={() => router.push('/event')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#B5651D', border: 'none', borderRadius: 14, padding: '12px 22px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
              행사 탐색하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B5651D" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 행사 개요 카드 ────────────────────────────── */}
        <div style={{ padding: '0 16px', marginTop: -20, position: 'relative', zIndex: 10 }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(181,101,29,0.12)', padding: '20px' }}>
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9C8F7A', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>행사 개요</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <OverviewItem icon="🏪" value={`${booths.length}개`} label="부스 운영" color="#B5651D" />
              <OverviewItem icon="🎵" value={`${perfs.length}개`} label="공연 예정" color="#D98C4A" />
              {settings.event_date && <OverviewItem icon="📅" value={settings.event_date} label="행사 일시" color="#0EA5E9" />}
              {settings.event_location && <OverviewItem icon="📍" value={settings.event_location} label="행사 장소" color="#10B981" />}
            </div>
          </div>
        </div>

        {/* ── 행사 소개 ────────────────────────────────── */}
        {settings.event_description && (
          <Section title="행사 소개" icon="🎪" accent="#D98C4A">
            <p style={{ fontSize: '0.9rem', color: '#3A2F22', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
              {settings.event_description}
            </p>
          </Section>
        )}

        {/* ── 교장선생님 말씀 ──────────────────────────── */}
        {settings.principal_message && (
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* 헤더 */}
              <div style={{ background: 'linear-gradient(135deg, #1E1045, #241C14)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  👨‍💼
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 2 }}>교장선생님 말씀</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>{settings.principal_name || '교장선생님'}</div>
                </div>
              </div>
              {/* 말씀 본문 */}
              <div style={{ padding: '20px' }}>
                {/* 인용 부호 */}
                <div style={{ fontSize: '2.5rem', lineHeight: 1, color: '#E7D2AE', fontFamily: 'Georgia, serif', marginBottom: -4 }}>"</div>
                <p style={{ fontSize: '0.9rem', color: '#3A2F22', lineHeight: 1.85, margin: '0 0 16px', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                  {settings.principal_message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: 1, flex: 1, background: '#E7D2AE' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8B4513' }}>— {settings.principal_name || '교장선생님'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 학교 서사 ────────────────────────────────── */}
        {settings.school_story && (
          <Section title="우리 학교 이야기" icon="🏫" accent="#B5651D">
            <p style={{ fontSize: '0.9rem', color: '#3A2F22', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
              {settings.school_story}
            </p>
          </Section>
        )}

        {/* 콘텐츠가 없을 때 플레이스홀더 */}
        {!settings.school_story && !settings.principal_message && !settings.event_description && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9C8F7A' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✏️</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              어드민에서 학교 서사와<br />교장선생님 말씀을 등록해 주세요.
            </p>
            <Link href="/admin" style={{ display: 'inline-block', marginTop: 14, padding: '10px 20px', background: '#F7EEDD', color: '#B5651D', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
              어드민으로 이동 →
            </Link>
          </div>
        )}

        <Footer />
      </div>

      {/* ── 하단 네비게이션 ─────────────────────────── */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #F2EAD9', display: 'flex', zIndex: 90 }}>
        {/* 홈 (active) */}
        <div className="home-nav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 18px', gap: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#B5651D" stroke="none">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#B5651D' }}>홈</span>
        </div>

        {/* 탐색 */}
        <Link href="/event" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 18px', textDecoration: 'none', gap: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9C8F7A" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: '0.62rem', fontWeight: 500, color: '#9C8F7A' }}>탐색</span>
        </Link>

        {/* 스탬프 (중앙 돌출) */}
        <button
          onClick={() => setSheetOpen(true)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 18px', border: 'none', background: 'none', cursor: 'pointer', gap: 4, fontFamily: 'inherit' }}
        >
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: stampToken ? 'linear-gradient(135deg,#B5651D,#D98C4A)' : '#241C14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', position: 'relative' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {stampToken && stampData && total > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {collected}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9C8F7A' }}>스탬프</span>
        </button>

      </nav>

      {/* ── 스탬프 바텀 시트 ─────────────────────────── */}
      {sheetOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setSheetOpen(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderRadius: '24px 24px 0 0', padding: '8px 20px 48px', animation: 'sheet-up 0.3s ease' }}>
            <div style={{ width: 40, height: 4, background: '#E8DFCF', borderRadius: 100, margin: '0 auto 24px' }} />

            {!stampToken ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎪</div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#241C14', margin: '0 0 6px' }}>스탬프 투어</h2>
                  <p style={{ fontSize: '0.85rem', color: '#7A6E5D' }}>배부받은 접속 코드를 입력하고 시작하세요</p>
                </div>
                <input
                  type="text" placeholder="접속 코드 (예: A3KN7M)" maxLength={12} autoCapitalize="characters"
                  value={codeInput}
                  onChange={e => { setCodeInput(e.target.value.toUpperCase()); setStampMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && !stampLoading && handleLogin()}
                  style={{ width: '100%', padding: '16px', border: '2px solid #E8DFCF', borderRadius: 14, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center', outline: 'none', marginBottom: 10, background: '#F7F1E6', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {stampMsg && <p style={{ fontSize: '0.82rem', color: '#EF4444', textAlign: 'center', margin: '0 0 10px' }}>{stampMsg}</p>}
                <button onClick={handleLogin} disabled={stampLoading}
                  style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #B5651D, #D98C4A)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: stampLoading ? 'not-allowed' : 'pointer', opacity: stampLoading ? 0.65 : 1, fontFamily: 'inherit' }}>
                  {stampLoading ? '확인 중...' : '시작하기 →'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#241C14', margin: 0 }}>스탬프 현황</h2>
                    <p style={{ fontSize: '0.78rem', color: '#9C8F7A', margin: '3px 0 0' }}>코드: {stampCode}</p>
                  </div>
                  <button onClick={doLogout} style={{ background: 'none', border: '1.5px solid #E8DFCF', borderRadius: 10, padding: '6px 14px', fontSize: '0.78rem', color: '#7A6E5D', cursor: 'pointer', fontFamily: 'inherit' }}>로그아웃</button>
                </div>
                {stampData && (
                  <>
                    <div style={{ background: 'linear-gradient(135deg, #F7EEDD, #F0E4CC)', borderRadius: 18, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#B5651D', lineHeight: 1 }}>
                        {collected}<span style={{ fontSize: '1rem', color: '#9C8F7A', fontWeight: 500 }}> / {goal}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#8B4513', marginTop: 4, marginBottom: 14 }}>
                        {collected >= goal && goal > 0 ? '🎉 완주 달성!' : '수집한 스탬프'}
                      </div>
                      <div style={{ height: 8, background: '#EAD9BE', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #B5651D, #D98C4A)', borderRadius: 100, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Link href="/board" style={{ flex: 1, padding: '13px', background: '#F7EEDD', color: '#B5651D', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>📋 보드</Link>
                      <Link href="/scan"  style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #B5651D, #D98C4A)', color: '#fff', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>📷 QR 스캔</Link>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── 헬퍼 컴포넌트 ──────────────────────────────────────────
function Section({ title, icon, accent, children }) {
  return (
    <div style={{ padding: '0 16px 8px' }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: accent, margin: 0, letterSpacing: '0.02em' }}>{title}</h2>
          <div style={{ flex: 1, height: 1, background: `${accent}22` }} />
        </div>
        {children}
      </div>
    </div>
  );
}

function OverviewItem({ icon, value, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#241C14', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: '#9C8F7A', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
