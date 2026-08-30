'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const CIRCUMFERENCE = 2 * Math.PI * 32; // ≈ 201.06

function BoothDisplay() {
  const searchParams = useSearchParams();
  const [showAuth, setShowAuth] = useState(true);
  const [boothId, setBoothId] = useState('');
  const [boothKey, setBoothKey] = useState('');
  const [boothInfo, setBoothInfo] = useState({ name: '로딩 중...', location: '' });
  const [status, setStatus] = useState('QR 코드 로딩 중...');
  const [timer, setTimer] = useState({ sec: 10, pct: 1, urgent: false });
  const canvasRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const id = searchParams.get('id');
    const key = searchParams.get('key');
    if (id && key) {
      setBoothId(id);
      setBoothKey(key);
      setShowAuth(false);
      startFetch(id, key);
    }
    return () => {
      clearTimeout(refreshTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [searchParams]);

  async function startFetch(id, key) {
    clearTimeout(refreshTimerRef.current);
    clearInterval(countdownRef.current);

    try {
      const res = await fetch(`/api/booth/${id}/token?key=${encodeURIComponent(key)}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus(`오류: ${data.error}`);
        refreshTimerRef.current = setTimeout(() => startFetch(id, key), 3000);
        return;
      }

      setBoothInfo({ name: data.boothName, location: data.location || '' });
      setStatus('✅ QR 코드 활성화 중');

      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(canvasRef.current, data.qrData, {
        width: 256,
        margin: 2,
        color: { dark: '#241C14', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });

      startCountdown(data.remainingMs);
      refreshTimerRef.current = setTimeout(() => startFetch(id, key), data.remainingMs + 200);
    } catch {
      setStatus('서버 연결 오류 — 재시도 중...');
      refreshTimerRef.current = setTimeout(() => startFetch(id, key), 3000);
    }
  }

  function startCountdown(remainingMs) {
    clearInterval(countdownRef.current);
    const deadline = Date.now() + remainingMs;

    countdownRef.current = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      const sec = Math.ceil(left / 1000);
      setTimer({ sec, pct: left / 10000, urgent: sec <= 3 });
      if (left <= 0) clearInterval(countdownRef.current);
    }, 100);
  }

  function handleStartDisplay() {
    if (!boothId || !boothKey) {
      alert('부스 번호와 접근 키를 입력해 주세요.');
      return;
    }
    setShowAuth(false);
    startFetch(boothId, boothKey);
  }

  const ringOffset = CIRCUMFERENCE * (1 - timer.pct);

  if (showAuth) {
    return (
      <div className="booth-page">
        <div className="booth-header">
          <h1>🎪 부스 QR</h1>
          <div className="location">부스 운영자 전용</div>
        </div>
        <div className="card auth-screen">
          <div className="input-wrap">
            <label>부스 번호</label>
            <input
              type="number"
              min="1"
              placeholder="1"
              value={boothId}
              onChange={e => setBoothId(e.target.value)}
            />
          </div>
          <div className="input-wrap">
            <label>접근 키</label>
            <input
              type="text"
              placeholder="seed 스크립트 출력값"
              value={boothKey}
              onChange={e => setBoothKey(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleStartDisplay}>
            QR 디스플레이 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booth-page">
      <div className="booth-header">
        <h1>{boothInfo.name}</h1>
        <div className="location">{boothInfo.location}</div>
      </div>

      <div className="qr-card">
        <canvas ref={canvasRef} width={256} height={256} style={{ borderRadius: 12, display: 'block' }} />

        <div className="timer-ring">
          <svg
            className="progress-ring"
            viewBox="0 0 80 80"
            style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
          >
            <circle className="ring-bg" cx="40" cy="40" r="32" />
            <circle
              className="ring-fill"
              cx="40" cy="40" r="32"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              stroke={timer.urgent ? 'var(--danger)' : 'var(--primary)'}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div className={`timer-value ${timer.urgent ? 'urgent' : 'normal'}`}>{timer.sec}</div>
            <div className="timer-label">초</div>
          </div>
        </div>
      </div>

      <div className="booth-instruction">
        <p>📱 모바일 앱의 <strong>QR 스캔</strong> 화면에서<br />이 QR 코드를 촬영하세요</p>
        <div className="mt-8" style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', minHeight: 20 }}>
          {status}
        </div>
      </div>
    </div>
  );
}

export default function BoothPage() {
  return (
    <Suspense fallback={
      <div className="booth-page">
        <div className="booth-header"><h1>🎪 부스 QR</h1></div>
      </div>
    }>
      <BoothDisplay />
    </Suspense>
  );
}
