'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FLOORS } from '@/lib/floors';
import { boothIcon } from '@/lib/boothIcons';
import { PARTNER_CATEGORY, PARTNER_CATEGORY_LABEL } from '@/lib/categories';
import { useLikedBooths } from '@/lib/useLikedBooths';

const PLACEHOLDER_COLORS = [
  'linear-gradient(135deg, #B5651D, #D98C4A)',
  'linear-gradient(135deg, #0EA5E9, #38BDF8)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #F59E0B, #FCD34D)',
  'linear-gradient(135deg, #EF4444, #F87171)',
  'linear-gradient(135deg, #6B7A3F, #9CAA5F)',
];

export default function BoothDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [booth, setBooth] = useState(null);
  const [allBooths, setAllBooths] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [stamped, setStamped] = useState(false);
  const { isLiked, toggleLike } = useLikedBooths();

  useEffect(() => {
    fetch(`/api/booth/${id}`).then(r => r.json()).then(setBooth).catch(() => {});
    fetch('/api/booth').then(r => r.json()).then(setAllBooths).catch(() => {});

    const tok = localStorage.getItem('stamp_token');
    if (!tok) return;
    fetch('/api/stamps/my', { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStamped(!!d?.booths.find(b => String(b.id) === String(id))?.stamped))
      .catch(() => {});
  }, [id]);

  if (!booth) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7EEDD' }}>
        <div style={{ textAlign: 'center', color: '#9C8F7A' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <p style={{ fontSize: '0.88rem' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  const idx = allBooths.findIndex(b => b.id === booth.id);
  const icon = boothIcon(booth, idx >= 0 ? idx : 0);
  const bgGradient = PLACEHOLDER_COLORS[idx >= 0 ? idx % PLACEHOLDER_COLORS.length : 0];
  const desc = booth.description || '';
  const shortDesc = desc.length > 120 ? desc.slice(0, 120) + '…' : desc;
  const hasLong = desc.length > 120;

  // 이전/다음 부스
  const prevBooth = idx > 0 ? allBooths[idx - 1] : null;
  const nextBooth = idx < allBooths.length - 1 ? allBooths[idx + 1] : null;

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* ── 히어로 이미지 ─────────────────────────────── */}
      <div style={{ position: 'relative', height: '52vh', minHeight: 280, overflow: 'hidden' }}>
        {booth.image_url ? (
          <img
            src={booth.image_url}
            alt={booth.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: bgGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
          }}>
            <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>{icon}</span>
          </div>
        )}

        {/* 상단 그라디언트 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)', pointerEvents: 'none' }} />
        {/* 하단 그라디언트 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)', pointerEvents: 'none' }} />

        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#241C14" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* 좋아요 버튼 */}
        <button
          onClick={() => toggleLike(booth.id)}
          style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked(booth.id) ? '#EF4444' : 'none'} stroke={isLiked(booth.id) ? '#EF4444' : '#241C14'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

      </div>

      {/* ── 정보 카드 ─────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', marginTop: -24, position: 'relative', zIndex: 10, padding: '24px 20px 100px' }}>

        {/* 이름 + 위치 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#241C14', lineHeight: 1.2, margin: 0 }}>{booth.name}</h1>
            <span style={{ flexShrink: 0, fontSize: '2rem', lineHeight: 1 }}>{icon}</span>
          </div>
          {booth.category === PARTNER_CATEGORY && (
            <span style={{ display: 'inline-block', marginTop: 8, background: '#8B5CF6', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
              🤝 {PARTNER_CATEGORY_LABEL}
            </span>
          )}
          {booth.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: '#7A6E5D', fontSize: '0.88rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B5651D" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ color: '#B5651D', fontWeight: 600 }}>{booth.location}</span>
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: '#F2EAD9', marginBottom: 20 }} />

        {/* 스탯 행 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {[
            { label: '층', value: FLOORS.find(f => f.value === (booth.floor || '1'))?.label ?? '1층' },
            { label: '위치', value: booth.location || '미정' },
            { label: '스탬프', value: stamped ? '✓ 수집 완료' : '수집 가능', color: stamped ? '#16A34A' : '#B5651D' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #F2EAD9' : 'none' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: s.color || '#B5651D', marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#9C8F7A', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 설명 */}
        {desc && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#241C14', marginBottom: 10 }}>소개</h2>
            <p style={{ fontSize: '0.88rem', color: '#7A6E5D', lineHeight: 1.7, margin: 0 }}>
              {expanded ? desc : shortDesc}
            </p>
            {hasLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: '#B5651D', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '6px 0 0', fontFamily: 'inherit' }}
              >
                {expanded ? '접기' : '더 보기'}
              </button>
            )}
          </div>
        )}

        {/* 이전/다음 부스 */}
        {(prevBooth || nextBooth) && (
          <div style={{ display: 'flex', gap: 10 }}>
            {prevBooth && (
              <button
                onClick={() => router.push(`/booths/${prevBooth.id}`)}
                style={{ flex: 1, padding: '11px 13px', background: '#F7EEDD', color: '#B5651D', border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.75 }}>← (이전 부스)</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{prevBooth.name}</span>
              </button>
            )}
            {nextBooth && (
              <button
                onClick={() => router.push(`/booths/${nextBooth.id}`)}
                style={{ flex: 1, padding: '11px 13px', background: 'linear-gradient(135deg, #B5651D, #D98C4A)', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.85 }}>(다음 부스) →</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{nextBooth.name}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 하단 고정 바 ─────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #F2EAD9', padding: '16px 20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#9C8F7A', fontWeight: 500, marginBottom: 2 }}>부스 #{idx + 1}</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#241C14' }}>{booth.name}</div>
        </div>
        <button
          onClick={() => router.push('/event')}
          style={{ height: 48, padding: '0 22px', borderRadius: 100, background: 'linear-gradient(135deg, #B5651D, #D98C4A)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(181,101,29,0.35)' }}
        >
          목록
        </button>
      </div>
    </div>
  );
}
