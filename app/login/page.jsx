'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '', show: false });
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (localStorage.getItem('stamp_token')) {
      router.replace('/board');
    }
    fetch('/api/settings').then(r => r.json()).then(s => setLogoUrl(s.logo_url || '')).catch(() => {});
  }, [router]);

  function showToast(msg, type = '') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  }

  async function login() {
    if (!code.trim()) { showToast('접속 코드를 입력해 주세요.', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); return; }

      localStorage.setItem('stamp_token', data.token);
      localStorage.setItem('stamp_code', data.code);
      router.push('/board');
    } catch {
      showToast('서버에 연결할 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 20px' }}>
        <Link href="/event" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
          ← 행사 홈으로
        </Link>
      </div>
      <div className="hero">
        {logoUrl ? (
          <img src={logoUrl} alt="로고" style={{ height: 48, margin: '0 auto 12px', display: 'block', objectFit: 'contain' }} />
        ) : (
          <div className="logo">🎪</div>
        )}
        <h2>스탬프 투어</h2>
        <p>배부받은 접속 코드를 입력하고<br />스탬프 수집을 시작하세요!</p>
      </div>

      <div className="card">
        <div className="input-wrap">
          <label htmlFor="code">접속 코드</label>
          <input
            id="code"
            type="text"
            inputMode="text"
            placeholder="예: A3KN7M"
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && !loading && login()}
            style={{ letterSpacing: '0.15em', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}
          />
        </div>
        <button className="btn btn-primary" onClick={login} disabled={loading}>
          {loading ? '확인 중...' : '시작하기 →'}
        </button>
        <p className="text-muted text-center mt-8">접속 코드는 현장에서 배부됩니다</p>
      </div>

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.msg}</div>
    </div>
  );
}
