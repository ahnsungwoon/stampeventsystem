'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '../_components/Footer';
import ZoomableMap from '../_components/ZoomableMap';
import { FLOORS } from '@/lib/floors';
import { boothIcon } from '@/lib/boothIcons';
import { PARTNER_CATEGORY, PARTNER_CATEGORY_LABEL } from '@/lib/categories';
import { useLikedBooths } from '@/lib/useLikedBooths';

const CARD_COLORS = [
  'linear-gradient(135deg, #B5651D, #D98C4A)',
  'linear-gradient(135deg, #0EA5E9, #38BDF8)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #F59E0B, #FCD34D)',
  'linear-gradient(135deg, #EF4444, #F87171)',
  'linear-gradient(135deg, #6B7A3F, #9CAA5F)',
];
const PERF_PALETTE = [
  { bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB', dot: '#3B82F6' },
  { bg: '#F7EEDD', border: '#EAD9BE', accent: '#8B4513', dot: '#A8672F' },
  { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A', dot: '#22C55E' },
  { bg: '#FFF7ED', border: '#FED7AA', accent: '#EA580C', dot: '#F97316' },
  { bg: '#FDF2F8', border: '#FBCFE8', accent: '#DB2777', dot: '#EC4899' },
  { bg: '#F0FDFA', border: '#99F6E4', accent: '#0D9488', dot: '#14B8A6' },
];
const TABS = [
  { id: 'booths',   label: '부스' },
  { id: 'map',      label: '지도' },
  { id: 'schedule', label: '공연' },
];

export default function EventPage() {
  const router = useRouter();
  const [settings,      setSettings]      = useState({});
  const [booths,        setBooths]        = useState([]);
  const [performances,  setPerformances]  = useState([]);
  const [markers,       setMarkers]       = useState([]);
  const [activeTab,     setActiveTab]     = useState('booths');
  const [activeFloor,   setActiveFloor]   = useState('');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const { likedIds, isLiked, toggleLike } = useLikedBooths();

  // stamp sheet
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [stampToken,   setStampToken]   = useState(null);
  const [stampCode,    setStampCode]    = useState('');
  const [stampData,    setStampData]    = useState(null);
  const [codeInput,    setCodeInput]    = useState('');
  const [stampLoading, setStampLoading] = useState(false);
  const [stampMsg,     setStampMsg]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/booth').then(r => r.json()),
      fetch('/api/performances').then(r => r.json()),
      fetch('/api/map-markers').then(r => r.json()),
    ]).then(([s, b, p, m]) => {
      setSettings(s); setBooths(b); setPerformances(p); setMarkers(m);
    }).catch(() => {});

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

  function getBoothForMarker(m) { return booths.find(b => b.id === m.booth_id); }

  const collected = stampData?.collected ?? 0;
  const total     = stampData?.total     ?? 0;
  const goal      = stampData?.goal      ?? 0;
  const pct       = goal ? Math.round((Math.min(collected, goal) / goal) * 100) : 0;

  const floorBooths = booths
    .filter(b => {
      if (activeFloor === PARTNER_CATEGORY) return b.category === PARTNER_CATEGORY;
      if (!activeFloor) return true;
      return (b.floor || '1') === activeFloor;
    })
    .filter(b => !showLikedOnly || isLiked(b.id));

  return (
    <>
      <style>{`
        .ev-scroll::-webkit-scrollbar { display: none; }
        .ev-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div style={{ width: '100%', minHeight: '100dvh', background: '#F7F1E6', maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>

        {/* ── 헤더 ─────────────────────────────────── */}
        <div style={{ padding: '52px 20px 0', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#241C14', letterSpacing: '-0.03em', margin: 0 }}>둘러보기</h1>
              {settings.event_name && (
                <p style={{ fontSize: '0.8rem', color: '#9C8F7A', margin: '3px 0 0' }}>{settings.event_name}</p>
              )}
            </div>
            {/* 스탬프 버튼만 */}
            <button
              onClick={() => setSheetOpen(true)}
              style={{ width: 38, height: 38, borderRadius: '50%', background: stampToken ? '#B5651D' : '#F7EEDD', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stampToken ? '#fff' : '#B5651D'} strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              {stampToken && stampData && total > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {collected}
                </span>
              )}
            </button>
          </div>

          {/* 탭 바 */}
          <div className="ev-scroll" style={{ display: 'flex', gap: 24, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 0 14px', fontSize: '0.92rem', fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#241C14' : '#9C8F7A', position: 'relative', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
              >
                {t.label}
                {activeTab === t.id && (
                  <span style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#B5651D' }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: '#F2EAD9' }} />
        </div>

        {/* ── 컨텐츠 ───────────────────────────────── */}
        <div style={{ paddingTop: 20 }}>

          {/* 부스 탭 */}
          {activeTab === 'booths' && (
            <>
              {booths.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9C8F7A' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏪</div>
                  <p>부스 정보를 불러오는 중입니다.</p>
                </div>
              ) : (
                <>
                  {/* 세화고 X 방배ART유스센터 강조 배너 */}
                  <div style={{ padding: '0 20px 12px' }}>
                    <button
                      onClick={() => setActiveFloor(f => f === PARTNER_CATEGORY ? '' : PARTNER_CATEGORY)}
                      style={{
                        width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 18, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        background: activeFloor === PARTNER_CATEGORY
                          ? 'linear-gradient(135deg, #7C3AED, #A78BFA)'
                          : 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
                        boxShadow: activeFloor === PARTNER_CATEGORY ? '0 6px 20px rgba(124,58,237,0.35)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.7rem', flexShrink: 0 }}>🤝</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: activeFloor === PARTNER_CATEGORY ? '#fff' : '#5B21B6' }}>
                          {PARTNER_CATEGORY_LABEL}
                        </div>
                        <div style={{ fontSize: '0.74rem', marginTop: 2, color: activeFloor === PARTNER_CATEGORY ? 'rgba(255,255,255,0.85)' : '#8B5CF6' }}>
                          {activeFloor === PARTNER_CATEGORY ? '전체 보기로 돌아가기' : '협업 부스 모아보기'}
                        </div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeFloor === PARTNER_CATEGORY ? '#fff' : '#8B5CF6'} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  {/* 내가 좋아요한 부스 */}
                  <div style={{ padding: '0 20px 12px' }}>
                    <button
                      onClick={() => setShowLikedOnly(v => !v)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        border: `1.5px solid ${showLikedOnly ? '#EF4444' : '#E8DFCF'}`,
                        background: showLikedOnly ? '#EF4444' : '#fff',
                        color: showLikedOnly ? '#fff' : '#7A6E5D',
                      }}
                    >
                      <span>{showLikedOnly ? '❤️' : '🤍'}</span>
                      내가 좋아요한 부스{likedIds.length > 0 ? ` (${likedIds.length})` : ''}
                    </button>
                  </div>

                  {/* 층별 안내 */}
                  <div className="ev-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 16px' }}>
                    {[{ value: '', label: '전체' }, ...FLOORS].map(f => (
                      <button
                        key={f.value}
                        onClick={() => setActiveFloor(f.value)}
                        style={{
                          flexShrink: 0, padding: '8px 16px', borderRadius: 100, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                          border: `1.5px solid ${activeFloor === f.value ? '#B5651D' : '#E8DFCF'}`,
                          background: activeFloor === f.value ? '#B5651D' : '#fff',
                          color: activeFloor === f.value ? '#fff' : '#7A6E5D',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {floorBooths.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9C8F7A' }}>
                      <div style={{ fontSize: '3rem', marginBottom: 12 }}>{showLikedOnly ? '🤍' : '🏢'}</div>
                      <p>{showLikedOnly ? '아직 좋아요한 부스가 없습니다.' : '이 층에는 등록된 부스가 없습니다.'}</p>
                    </div>
                  ) : (
                    <>
                      <div className="ev-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px 4px' }}>
                        {floorBooths.map((b, i) => (
                          <div
                            key={b.id}
                            onClick={() => router.push(`/booths/${b.id}`)}
                            style={{ flexShrink: 0, width: 220, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                          >
                            <div style={{ height: 160, background: b.image_url ? `url(${b.image_url}) center/cover` : CARD_COLORS[i % CARD_COLORS.length], position: 'relative' }}>
                              {!b.image_url && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
                                  {boothIcon(b, i)}
                                </div>
                              )}
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)' }} />
                              <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4 }}>
                                <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 100 }}>
                                  {FLOORS.find(fl => fl.value === (b.floor || '1'))?.label ?? '1층'}
                                </span>
                                {b.category === PARTNER_CATEGORY && (
                                  <span style={{ background: 'rgba(139,92,246,0.85)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 100 }}>🤝 협업</span>
                                )}
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); toggleLike(b.id); }}
                                style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                              >
                                {isLiked(b.id) ? '❤️' : '🤍'}
                              </button>
                              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>{b.name}</div>
                                {b.club_name && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', marginTop: 2 }}>🎪 {b.club_name}</div>}
                                {b.location  && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', marginTop: 1 }}>📍 {b.location}</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: '24px 20px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#241C14', margin: 0 }}>
                            {showLikedOnly ? '좋아요한 부스' : activeFloor === PARTNER_CATEGORY ? PARTNER_CATEGORY_LABEL : activeFloor ? `${FLOORS.find(f => f.value === activeFloor)?.label} 부스` : '전체 부스'}
                          </h2>
                          <span style={{ fontSize: '0.78rem', color: '#9C8F7A' }}>총 {floorBooths.length}개</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {floorBooths.map((b, i) => (
                            <div
                              key={b.id}
                              onClick={() => router.push(`/booths/${b.id}`)}
                              style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', position: 'relative' }}
                            >
                              <div style={{ height: 90, background: b.image_url ? `url(${b.image_url}) center/cover` : CARD_COLORS[i % CARD_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                {!b.image_url && <span style={{ fontSize: '2.2rem' }}>{boothIcon(b, i)}</span>}
                                <button
                                  onClick={e => { e.stopPropagation(); toggleLike(b.id); }}
                                  style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                                >
                                  {isLiked(b.id) ? '❤️' : '🤍'}
                                </button>
                              </div>
                              <div style={{ padding: '10px 12px 12px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#241C14' }}>{b.name}</div>
                                {b.club_name && <div style={{ fontSize: '0.72rem', color: '#B5651D', marginTop: 1 }}>{b.club_name}</div>}
                                {b.location  && <div style={{ fontSize: '0.7rem',  color: '#9C8F7A', marginTop: 1 }}>{b.location}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* 지도 탭 */}
          {activeTab === 'map' && (
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#241C14', margin: '0 0 14px' }}>학교 지도</h2>
              {settings.map_image ? (
                <ZoomableMap image={settings.map_image} markers={markers} getBoothForMarker={getBoothForMarker} />
              ) : (
                <div style={{ textAlign: 'center', padding: '52px 0', color: '#9C8F7A' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗺️</div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>지도를 준비 중입니다.<br />어드민에서 지도 이미지를 업로드해 주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 공연 탭 */}
          {activeTab === 'schedule' && (
            <div style={{ padding: '0 20px' }}>
              {/* 공연 안내사항 */}
              {settings.performance_notice && (
                <div style={{
                  background:   '#FFF7ED',
                  border:       '1.5px solid #FED7AA',
                  borderRadius: 14,
                  padding:      '14px 16px',
                  marginBottom: 16,
                  display:      'flex',
                  gap:          10,
                  alignItems:   'flex-start',
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📢</span>
                  <p style={{ fontSize: '0.85rem', color: '#92400E', lineHeight: 1.6, margin: 0 }}>
                    {settings.performance_notice}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#241C14', margin: 0 }}>공연 일정</h2>
                <span style={{ fontSize: '0.78rem', color: '#9C8F7A' }}>총 {performances.length}개</span>
              </div>
              {performances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '52px 0', color: '#9C8F7A' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎵</div>
                  <p>공연 일정을 준비 중입니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {performances.map((p, i) => {
                    const c = PERF_PALETTE[i % PERF_PALETTE.length];
                    return (
                      <div key={p.id} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '16px', display: 'flex', gap: 14 }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, minWidth: 50 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, marginBottom: 6, boxShadow: `0 0 0 3px ${c.border}` }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: c.accent }}>{p.start_time}</div>
                          {p.end_time && <div style={{ fontSize: '0.68rem', color: '#9C8F7A', marginTop: 2 }}>~{p.end_time}</div>}
                        </div>
                        <div style={{ width: 2, background: c.border, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#241C14', margin: '0 0 4px' }}>{p.title}</h3>
                          {p.performer  && <p style={{ fontSize: '0.78rem', color: '#7A6E5D', margin: '2px 0' }}>👤 {p.performer}</p>}
                          {p.location   && <p style={{ fontSize: '0.78rem', color: '#7A6E5D', margin: '2px 0' }}>📍 {p.location}</p>}
                          {p.description && <p style={{ fontSize: '0.76rem', color: '#7A6E5D', marginTop: 5, lineHeight: 1.5 }}>{p.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Footer />
      </div>

      {/* ── 하단 네비게이션 ──────────────────────────── */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #F2EAD9', display: 'flex', zIndex: 90 }}>
        <Link href="/" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 18px', textDecoration: 'none', gap: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9C8F7A" strokeWidth="2" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize: '0.62rem', fontWeight: 500, color: '#9C8F7A' }}>홈</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 18px', gap: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#241C14" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#241C14' }}>탐색</span>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 18px', border: 'none', background: 'none', cursor: 'pointer', gap: 4 }}
        >
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: stampToken ? 'linear-gradient(135deg,#B5651D,#D98C4A)' : '#241C14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9C8F7A' }}>스탬프</span>
        </button>
      </nav>

      {/* ── 스탬프 바텀 시트 ──────────────────────────── */}
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
                        {stampData.reward_claimed ? '🎁 상품 수령 완료!' : collected >= goal && goal > 0 ? '🎉 완주 달성!' : '수집한 스탬프'}
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
