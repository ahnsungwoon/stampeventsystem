'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { boothIcon } from '@/lib/boothIcons';

export default function BoardPage() {
  const router  = useRouter();
  const [data,    setData]    = useState(null);
  const [myCode,  setMyCode]  = useState('');
  const [toast,   setToast]   = useState({ msg: '', type: '', show: false });

  useEffect(() => {
    const token = localStorage.getItem('stamp_token');
    if (!token) { router.replace('/login'); return; }
    setMyCode(localStorage.getItem('stamp_code') || '');
    loadBoard(token);

    const flash = sessionStorage.getItem('stamp_flash');
    if (flash) {
      sessionStorage.removeItem('stamp_flash');
      setTimeout(() => showToast(flash, 'success'), 300);
    }
  }, [router]);

  async function loadBoard(token) {
    try {
      const res = await fetch('/api/stamps/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { logout(); return; }
      setData(await res.json());
    } catch {
      showToast('데이터를 불러오지 못했습니다.', 'error');
    }
  }

  function showToast(msg, type = '') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }

  function logout() {
    localStorage.removeItem('stamp_token');
    localStorage.removeItem('stamp_code');
    router.replace('/login');
  }

  const collected     = data?.collected      ?? 0;
  const total         = data?.total          ?? 0;
  const goal          = data?.goal           ?? 0;
  const pct           = goal ? Math.round((Math.min(collected, goal) / goal) * 100) : 0;
  const isComplete    = collected >= goal && goal > 0;
  const isClaimed     = !!data?.reward_claimed;

  function progressMsg() {
    if (!data) return '불러오는 중...';
    if (isClaimed)      return '상품 수령 완료! 🎁';
    if (isComplete)     return '완주했습니다! 🎊';
    if (collected === 0) return '시작해볼까요?';
    if (collected < goal / 2)     return '조금씩 모아보세요!';
    if (collected < goal * 0.75)  return '절반을 넘었어요!';
    if (collected < goal - 1)     return '거의 다 왔어요!';
    return '완주까지 하나 남았어요!';
  }

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>스탬프 보드</h1>
            <div className="subtitle">코드: {myCode || '...'}</div>
          </div>
          <button
            className="btn btn-outline"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '0.8rem' }}
            onClick={logout}
          >
            로그아웃
          </button>
        </div>

        <div className="card">
          <div className="progress-wrap">
            <div className="progress-label">
              <span>수집 현황</span>
              <span>{collected} / {goal}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-muted text-center mt-8">{progressMsg()}</div>
          {goal > 0 && total > goal && (
            <div className="text-muted text-center" style={{ fontSize: '0.76rem', marginTop: 4 }}>
              전체 {total}개 부스 중 {goal}개만 모으면 상품을 받을 수 있어요!
            </div>
          )}
        </div>

        {/* 상품 수령 완료 배지 */}
        {isClaimed && (
          <div style={{
            margin: '0 16px 16px',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            color: '#fff',
            borderRadius: 16,
            padding: '16px 20px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🎁</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>상품 수령 완료!</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: 4 }}>목표 스탬프를 모으고 상품을 받았습니다</div>
          </div>
        )}

        <div className="stamp-grid">
          {data?.booths.map((b, i) => (
            <div key={b.id} className={`stamp-item ${b.stamped ? 'earned stamp-earn-anim' : 'empty'}`}>
              <span className="stamp-icon">{b.stamped ? boothIcon(b, i) : '❓'}</span>
              <span className="stamp-name">{b.name}</span>
              {b.stamped && (
                <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 600 }}>✓ 완료</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          홈
        </Link>
        <Link href="/board" className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          보드
        </Link>
        <Link href="/scan" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
            <rect x="8" y="8" width="8" height="8" rx="1" />
          </svg>
          QR 스캔
        </Link>
      </nav>

      {/* 스탬프 완성 버튼 (완료 & 미수령 시) */}
      {isComplete && !isClaimed && (
        <div style={{
          position:   'fixed',
          bottom:     64,
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      '100%',
          maxWidth:   480,
          padding:    '0 16px 12px',
          zIndex:     200,
        }}>
          <button
            onClick={() => router.push('/stamp-complete')}
            style={{
              width:      '100%',
              padding:    '16px',
              background: 'linear-gradient(135deg, #B5651D, #D98C4A)',
              color:      '#fff',
              border:     'none',
              borderRadius: 16,
              fontSize:   '1.05rem',
              fontWeight: 700,
              cursor:     'pointer',
              boxShadow:  '0 8px 32px rgba(181,101,29,0.4)',
              animation:  'pulse 2s infinite',
              fontFamily: 'inherit',
            }}
          >
            🎉 스탬프 완성! → 상품 수령하기
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(181,101,29,0.4); }
          50%       { box-shadow: 0 8px 48px rgba(181,101,29,0.7); }
        }
      `}</style>

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.msg}</div>
    </>
  );
}
