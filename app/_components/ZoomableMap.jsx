'use client';
import { useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function ZoomableMap({ image, markers = [], getBoothForMarker }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [activeMarker, setActiveMarker] = useState(null);
  const viewportRef = useRef(null);
  const gesture = useRef({
    pointers: new Map(),
    dragging: false,
    moved: 0,
    lastMid: null,
    lastDist: null,
  });

  function clampScale(s) { return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)); }

  function clampView(v) {
    const el = viewportRef.current;
    if (!el) return v;
    const rect = el.getBoundingClientRect();
    const maxX = (rect.width  * (v.scale - 1)) / 2 + rect.width  * 0.2;
    const maxY = (rect.height * (v.scale - 1)) / 2 + rect.height * 0.2;
    return {
      scale: v.scale,
      x: Math.min(maxX, Math.max(-maxX, v.x)),
      y: Math.min(maxY, Math.max(-maxY, v.y)),
    };
  }

  function zoomAt(clientX, clientY, factor) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width  / 2;
    const cy = clientY - rect.top  - rect.height / 2;
    setView(v => {
      const nextScale = clampScale(v.scale * factor);
      const ratio = nextScale / v.scale;
      return clampView({
        scale: nextScale,
        x: cx - (cx - v.x) * ratio,
        y: cy - (cy - v.y) * ratio,
      });
    });
  }

  function zoomAtCenter(factor) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function resetView() { setView({ scale: 1, x: 0, y: 0 }); setActiveMarker(null); }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, factor);
  }

  function onPointerDown(e) {
    viewportRef.current?.setPointerCapture?.(e.pointerId);
    gesture.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = 0;
    if (gesture.current.pointers.size === 1) {
      gesture.current.dragging = true;
    } else if (gesture.current.pointers.size === 2) {
      const [a, b] = [...gesture.current.pointers.values()];
      gesture.current.lastMid  = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.current.lastDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(e) {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    const prev = g.pointers.get(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const mid  = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.lastDist && g.lastMid) {
        const factor = dist / g.lastDist;
        const prevMid = g.lastMid; // setView 콜백이 나중에 실행될 수 있어 ref를 미리 스냅샷
        setView(v => clampView({
          scale: clampScale(v.scale * factor),
          x: v.x + (mid.x - prevMid.x),
          y: v.y + (mid.y - prevMid.y),
        }));
      }
      g.lastMid  = mid;
      g.lastDist = dist;
      g.moved += 5;
      return;
    }

    if (g.dragging && g.pointers.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      g.moved += Math.abs(dx) + Math.abs(dy);
      setView(v => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  }

  function onPointerUp(e) {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) { g.lastMid = null; g.lastDist = null; }
    if (g.pointers.size === 0) g.dragging = false;
  }

  function onViewportClick() {
    if (gesture.current.moved > 8) return;
    setActiveMarker(null);
  }

  function onMarkerClick(e, m) {
    e.stopPropagation();
    if (gesture.current.moved > 8) return;
    setActiveMarker(prev => (prev?.id === m.id ? null : m));
  }

  return (
    <div>
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onViewportClick}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 20,
          background: '#F7F2E7', height: 420, touchAction: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #EAE0CB',
          cursor: gesture.current.dragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: 'center center',
            transition: gesture.current.dragging ? 'none' : 'transform 0.06s linear',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <img src={image} alt="학교 지도" style={{ width: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
            {markers.map(m => (
              <button
                key={m.id}
                onClick={e => onMarkerClick(e, m)}
                style={{ position: 'absolute', left: `${m.x_pct}%`, top: `${m.y_pct}%`, transform: `translate(-50%,-50%) scale(${1 / view.scale})`, transformOrigin: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
              >
                <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: m.color, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                {activeMarker?.id === m.id && (
                  <div
                    style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 12, padding: '10px 14px', minWidth: 130, maxWidth: 190, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', textAlign: 'left', zIndex: 20 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: '#241C14', marginBottom: 3 }}>{m.label}</strong>
                    {m.description && <p style={{ fontSize: '0.76rem', color: '#7A6E5D', margin: 0 }}>{m.description}</p>}
                    {getBoothForMarker?.(m) && (
                      <span style={{ display: 'inline-block', marginTop: 5, background: '#F0E4CC', color: '#B5651D', padding: '2px 8px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600 }}>
                        {getBoothForMarker(m).name}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <button onClick={() => zoomAtCenter(1.4)} style={mapBtnStyle}>＋</button>
          <button onClick={() => zoomAtCenter(1 / 1.4)} style={mapBtnStyle}>－</button>
          <button onClick={resetView} style={{ ...mapBtnStyle, fontSize: '0.65rem' }}>초기화</button>
        </div>
      </div>
      <p style={{ fontSize: '0.7rem', color: '#B0A488', textAlign: 'center', marginTop: 8 }}>
        손가락으로 밀거나 두 손가락으로 확대해 보세요.
      </p>
    </div>
  );
}

const mapBtnStyle = {
  width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(36,28,20,0.75)',
  color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
};
