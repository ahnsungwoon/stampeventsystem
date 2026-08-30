'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef(null);
  const isScanningRef = useRef(true);
  const [result, setResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('카메라 초기화 중...');

  useEffect(() => {
    const token = localStorage.getItem('stamp_token');
    if (!token) { router.replace('/login'); return; }

    let scanner;
    let active = true;
    isScanningRef.current = true;

    async function onScanSuccess(rawValue) {
      if (!isScanningRef.current) return;
      isScanningRef.current = false;

      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        setResult({ type: 'error', icon: '❌', title: '인식 실패', msg: '올바른 스탬프 QR 코드가 아닙니다.' });
        isScanningRef.current = true;
        return;
      }

      const { b: boothId, t: qrToken } = parsed;
      if (!boothId || !qrToken) {
        setResult({ type: 'error', icon: '❌', title: '인식 실패', msg: 'QR 코드 형식이 올바르지 않습니다.' });
        isScanningRef.current = true;
        return;
      }

      try {
        await scannerRef.current?.pause(true);
      } catch {}

      try {
        const res = await fetch('/api/stamps/collect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ boothId, token: qrToken }),
        });
        const data = await res.json();

        if (res.ok) {
          setResult({ type: 'success', icon: '🎉', title: '스탬프 적립!', msg: data.message });
          sessionStorage.setItem('stamp_flash', data.message);
          setTimeout(() => router.push('/board'), 2000);
        } else if (res.status === 409) {
          setResult({ type: 'error', icon: '⚠️', title: '이미 수집함', msg: data.error });
        } else if (res.status === 401 && data.error.includes('만료')) {
          setResult({ type: 'error', icon: '⏱️', title: 'QR 만료', msg: data.error });
        } else {
          setResult({ type: 'error', icon: '❌', title: '오류', msg: data.error });
        }
      } catch {
        setResult({ type: 'error', icon: '❌', title: '서버 오류', msg: '잠시 후 다시 시도해 주세요.' });
      }
    }

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!active) return;
        scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          onScanSuccess,
          () => {}
        );
        setStatusMsg('📱 QR 코드를 화면 중앙에 맞춰주세요');
      } catch {
        setStatusMsg('카메라 권한을 허용해 주세요.');
      }
    }

    initScanner();

    return () => {
      active = false;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [router]);

  async function rescan() {
    setResult(null);
    isScanningRef.current = true;
    try {
      await scannerRef.current?.resume();
    } catch {}
  }

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>QR 스캔</h1>
            <div className="subtitle">부스의 QR 코드를 촬영하세요</div>
          </div>
        </div>

        <div className="scan-overlay card" style={{ marginBottom: 16 }}>
          <h3>📸 QR 코드 스캔</h3>
          <p>부스에 있는 화면의 QR 코드를<br />카메라로 비춰주세요. (10초마다 갱신)</p>
        </div>

        {/* DOM에 유지하되 결과 카드 표시 시 숨김 (스캐너 참조 보존) */}
        <div id="reader" style={{ display: result ? 'none' : 'block' }} />
        {!result && <div className="scan-status">{statusMsg}</div>}

        {result && (
          <div className={`result-card ${result.type}`}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{result.icon}</div>
            <h3>{result.title}</h3>
            <p>{result.msg}</p>
            <button className="btn btn-primary mt-16" onClick={rescan}>다시 스캔</button>
            <Link href="/board" className="btn btn-outline mt-8">보드 보기</Link>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          홈
        </Link>
        <Link href="/board" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          보드
        </Link>
        <Link href="/scan" className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
            <rect x="8" y="8" width="8" height="8" rx="1" />
          </svg>
          QR 스캔
        </Link>
      </nav>
    </>
  );
}
