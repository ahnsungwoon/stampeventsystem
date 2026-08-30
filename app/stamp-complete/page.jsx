'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { boothIcon } from '@/lib/boothIcons';

export default function StampCompletePage() {
  const router  = useRouter();
  const [data,      setData]      = useState(null);
  const [pw,        setPw]        = useState('');
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');
  const [claimed,   setClaimed]   = useState(false);
  const [myCode,    setMyCode]    = useState('');

  useEffect(() => {
    const token = localStorage.getItem('stamp_token');
    if (!token) { router.replace('/login'); return; }
    setMyCode(localStorage.getItem('stamp_code') || '');
    loadData(token);
  }, [router]);

  async function loadData(token) {
    try {
      const res = await fetch('/api/stamps/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/login'); return; }
      const d = await res.json();
      setData(d);
      if (d.reward_claimed) setClaimed(true);
      if (d.collected < d.goal) {
        router.replace('/board');
      }
    } catch {
      setErr('데이터를 불러오지 못했습니다.');
    }
  }

  async function claim() {
    if (!pw.trim()) { setErr('직원 비밀번호를 입력해 주세요.'); return; }
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('stamp_token');
      const res = await fetch('/api/stamps/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ staffPassword: pw }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error); return; }
      setClaimed(true);
    } catch { setErr('서버에 연결할 수 없습니다.'); }
    finally   { setLoading(false); }
  }

  // ── 수령 완료 화면 ──────────────────────────────────────
  if (claimed) {
    return (
      <div style={{
        minHeight:      '100dvh',
        background:     'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px 20px',
        color:          '#fff',
        textAlign:      'center',
      }}>
        <div style={{ fontSize: '5rem', marginBottom: 16, animation: 'pop 0.6s ease' }}>🎁</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>상품 수령 완료!</h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: 32 }}>
          모든 스탬프를 수집하고 상품을 받았습니다. 수고하셨습니다!
        </p>
        <div style={{
          background:    'rgba(255,255,255,0.15)',
          border:        '2px solid rgba(255,255,255,0.4)',
          borderRadius:  20,
          padding:       '16px 32px',
          marginBottom:  24,
        }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 6 }}>내 접속 코드</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.2em', fontFamily: 'monospace' }}>
            {myCode}
          </div>
        </div>
        <button
          onClick={() => router.push('/board')}
          style={{
            padding:      '14px 32px',
            background:   'rgba(255,255,255,0.25)',
            color:        '#fff',
            border:       '2px solid rgba(255,255,255,0.5)',
            borderRadius: 14,
            fontSize:     '0.95rem',
            fontWeight:   700,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          스탬프 보드로 돌아가기
        </button>
        <style>{`@keyframes pop { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // ── 수령 전 화면 ────────────────────────────────────────
  return (
    <div style={{
      minHeight:      '100dvh',
      background:     'linear-gradient(135deg, #B5651D 0%, #D98C4A 100%)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '24px 20px',
      color:          '#fff',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* 완성 뱃지 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '4rem', marginBottom: 10 }}>🎉</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>스탬프 완성!</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
            목표 스탬프({data?.goal ?? '?'}개)를 모두 모았습니다
          </p>
        </div>

        {/* 스탬프 목록 */}
        {data && (
          <div style={{
            display:         'flex',
            flexWrap:        'wrap',
            justifyContent:  'center',
            gap:             8,
            marginBottom:    28,
          }}>
            {data.booths.filter(b => b.stamped).map((b, i) => (
              <div key={b.id} style={{
                width:          48,
                height:         48,
                background:     'rgba(255,255,255,0.2)',
                borderRadius:   12,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '1.5rem',
              }}>
                {boothIcon(b, i)}
              </div>
            ))}
          </div>
        )}

        {/* 직원 PW 입력 */}
        <div style={{
          background:   'rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding:      '24px 20px',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 14, lineHeight: 1.5 }}>
            직원이 비밀번호를 입력하면 상품 수령이 완료됩니다.
          </p>
          <input
            type="password"
            placeholder="직원 비밀번호"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && claim()}
            style={{
              width:        '100%',
              padding:      '14px 16px',
              border:       '2px solid rgba(255,255,255,0.4)',
              borderRadius: 12,
              fontSize:     '1rem',
              background:   'rgba(255,255,255,0.15)',
              color:        '#fff',
              outline:      'none',
              marginBottom: 10,
              fontFamily:   'inherit',
              boxSizing:    'border-box',
            }}
          />
          {err && (
            <p style={{ fontSize: '0.82rem', color: '#FCA5A5', marginBottom: 10 }}>{err}</p>
          )}
          <button
            onClick={claim}
            disabled={loading}
            style={{
              width:        '100%',
              padding:      '15px',
              background:   loading ? 'rgba(255,255,255,0.2)' : '#fff',
              color:        loading ? '#fff' : '#B5651D',
              border:       'none',
              borderRadius: 14,
              fontSize:     '1rem',
              fontWeight:   700,
              cursor:       loading ? 'not-allowed' : 'pointer',
              fontFamily:   'inherit',
              transition:   'all 0.2s',
            }}
          >
            {loading ? '확인 중...' : '✅ 상품 수령 확인'}
          </button>
        </div>

        <button
          onClick={() => router.push('/board')}
          style={{
            width:        '100%',
            marginTop:    14,
            padding:      '12px',
            background:   'transparent',
            color:        'rgba(255,255,255,0.7)',
            border:       '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: 14,
            fontSize:     '0.88rem',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
