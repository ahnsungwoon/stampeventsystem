'use client';
import { useState, useEffect, useRef } from 'react';
import { FLOORS } from '@/lib/floors';
import { BOOTH_ICON_OPTIONS } from '@/lib/boothIcons';
import { PARTNER_CATEGORY, PARTNER_CATEGORY_LABEL } from '@/lib/categories';

const TABS = [
  { id: 'info',         label: '📋 행사정보' },
  { id: 'map',          label: '🗺️ 지도' },
  { id: 'booths',       label: '🏪 부스' },
  { id: 'performances', label: '🎵 공연' },
  { id: 'notices',      label: '📢 공지' },
];
const PIN_COLORS = ['#B5651D', '#EF4444', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899'];

function adminHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `AdminBearer ${token}` };
}

// ─── 로그인 화면 ──────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');
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
    finally  { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, margin: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2rem' }}>🔐</div>
          <h2 style={{ color: 'var(--primary)', marginTop: 8 }}>관리자 로그인</h2>
        </div>
        <div className="input-wrap">
          <label>관리자 비밀번호</label>
          <input
            type="password"
            placeholder="ADMIN_PASSWORD"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
        </div>
        {err && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{err}</p>}
        <button className="btn btn-primary" onClick={login} disabled={loading}>
          {loading ? '확인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );
}

// ─── 행사 정보 탭 ──────────────────────────────────────────
function InfoTab({ token }) {
  const [form, setForm] = useState({
    event_name: '', event_date: '', event_location: '', event_description: '',
    school_story: '', principal_message: '', principal_name: '교장선생님',
    footer_org_name: '', footer_address: '', footer_contact: '', footer_extra: '',
    stamp_goal: '6',
  });
  const [saved, setSaved] = useState(false);
  const [logoUrl,    setLogoUrl]    = useState('');
  const [bannerUrl,  setBannerUrl]  = useState('');
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setForm(f => ({ ...f, ...s }));
      setLogoUrl(s.logo_url || '');
      setBannerUrl(s.home_banner || '');
    });
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: adminHeaders(token),
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function uploadBrandImage(e, type, setUrl, setUploading) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/upload?type=${type}`, {
      method: 'POST',
      headers: { Authorization: `AdminBearer ${token}` },
      body: fd,
    });
    const d = await res.json();
    if (res.ok) setUrl(d.path + '?t=' + Date.now());
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <h2 className="admin-section-title">브랜딩</h2>
      <div className="card">
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          로고는 로그인 화면 등에, 홈 배너는 홈 화면 상단에 표시됩니다. (지도 이미지는 '지도' 탭에서 따로 업로드합니다)
        </p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>로고</label>
            {logoUrl && (
              <img src={logoUrl} alt="로고" style={{ height: 48, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 6 }} />
            )}
            <label className="btn btn-outline" style={{ width: 'auto', display: 'inline-flex', cursor: 'pointer', padding: '8px 16px', fontSize: '0.82rem' }}>
              {uploadingLogo ? '업로드 중...' : '🖼️ 로고 업로드'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadBrandImage(e, 'logo', setLogoUrl, setUploadingLogo)} />
            </label>
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>홈 배너</label>
            {bannerUrl && (
              <img src={bannerUrl} alt="홈 배너" style={{ width: '100%', maxWidth: 280, height: 90, objectFit: 'cover', display: 'block', marginBottom: 10, borderRadius: 8, border: '1px solid var(--border)' }} />
            )}
            <label className="btn btn-outline" style={{ width: 'auto', display: 'inline-flex', cursor: 'pointer', padding: '8px 16px', fontSize: '0.82rem' }}>
              {uploadingBanner ? '업로드 중...' : '🖼️ 배너 업로드'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadBrandImage(e, 'banner', setBannerUrl, setUploadingBanner)} />
            </label>
          </div>
        </div>
      </div>

      <h2 className="admin-section-title">행사 기본 정보</h2>
      <div className="card">
        <div className="input-wrap">
          <label>행사 이름</label>
          <input value={form.event_name} onChange={e => set('event_name', e.target.value)} placeholder="예: 2025 과학 문화제" />
        </div>
        <div className="input-wrap">
          <label>행사 날짜/기간</label>
          <input value={form.event_date} onChange={e => set('event_date', e.target.value)} placeholder="예: 2025년 6월 20일 (금)" />
        </div>
        <div className="input-wrap">
          <label>장소</label>
          <input value={form.event_location} onChange={e => set('event_location', e.target.value)} placeholder="예: ○○고등학교" />
        </div>
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label>행사 소개</label>
          <textarea className="call-textarea" rows={3} value={form.event_description} onChange={e => set('event_description', e.target.value)} placeholder="행사 소개문을 입력하세요" />
        </div>
      </div>

      <h2 className="admin-section-title">🎯 스탬프 투어 설정</h2>
      <div className="card">
        <div className="input-wrap" style={{ marginBottom: 6 }}>
          <label>완주(상품 수령)에 필요한 스탬프 개수</label>
          <input
            type="number" min={1}
            value={form.stamp_goal}
            onChange={e => set('stamp_goal', e.target.value)}
            placeholder="예: 6"
            style={{ maxWidth: 140 }}
          />
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          부스가 많아도 참가자가 전체 부스를 다 돌 필요 없이, 여기서 정한 개수만 모으면 완주로 인정되어 상품을 받을 수 있습니다.
        </p>
      </div>

      <h2 className="admin-section-title">학교 서사</h2>
      <div className="card">
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label>학교 소개 / 서사</label>
          <textarea className="call-textarea" rows={5} value={form.school_story} onChange={e => set('school_story', e.target.value)} placeholder="학교의 역사, 특징, 교육 철학 등을 입력하세요" />
        </div>
      </div>

      <h2 className="admin-section-title">교장선생님 말씀</h2>
      <div className="card">
        <div className="input-wrap">
          <label>교장선생님 성함</label>
          <input value={form.principal_name} onChange={e => set('principal_name', e.target.value)} placeholder="예: 홍길동 교장선생님" />
        </div>
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label>말씀 내용</label>
          <textarea className="call-textarea" rows={5} value={form.principal_message} onChange={e => set('principal_message', e.target.value)} placeholder="교장선생님의 인사말 또는 격려 말씀을 입력하세요" />
        </div>
      </div>

      <h2 className="admin-section-title">푸터 (하단 정보)</h2>
      <div className="card">
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          홈 화면 맨 아래에 표시되는 기관/회사 정보입니다. 비워두면 해당 항목은 표시되지 않습니다.
        </p>
        <div className="input-wrap">
          <label>기관/회사명</label>
          <input value={form.footer_org_name} onChange={e => set('footer_org_name', e.target.value)} placeholder="예: ○○고등학교 학생회" />
        </div>
        <div className="input-wrap">
          <label>주소</label>
          <input value={form.footer_address} onChange={e => set('footer_address', e.target.value)} placeholder="예: 서울특별시 ○○구 ○○로 123" />
        </div>
        <div className="input-wrap">
          <label>연락처 / 이메일</label>
          <input value={form.footer_contact} onChange={e => set('footer_contact', e.target.value)} placeholder="예: 02-1234-5678 · duri@school.kr" />
        </div>
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label>추가 문구 (사업자등록번호 등, 선택)</label>
          <input value={form.footer_extra} onChange={e => set('footer_extra', e.target.value)} placeholder="예: 사업자등록번호 123-45-67890" />
        </div>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <button className="btn btn-primary" onClick={save}>{saved ? '✅ 저장됨' : '저장'}</button>
      </div>
    </div>
  );
}

// ─── 지도 탭 ──────────────────────────────────────────────
function MapTab({ token }) {
  const [mapImage,    setMapImage]    = useState('');
  const [markers,     setMarkers]     = useState([]);
  const [booths,      setBooths]      = useState([]);
  const [pendingPin,  setPendingPin]  = useState(null);
  const [editMarker,  setEditMarker]  = useState(null);
  const [markerForm,  setMarkerForm]  = useState({ label: '', description: '', color: '#B5651D', booth_id: '' });
  const [uploading,   setUploading]   = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setMapImage(s.map_image || ''));
    fetch('/api/map-markers').then(r => r.json()).then(setMarkers);
    fetch('/api/booth').then(r => r.json()).then(setBooths);
  }, []);

  async function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/upload?type=map', { method: 'POST', headers: { Authorization: `AdminBearer ${token}` }, body: fd });
    const d   = await res.json();
    if (res.ok) setMapImage(d.path + '?t=' + Date.now());
    setUploading(false);
  }

  function handleMapClick(e) {
    const rect = imgRef.current.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width)  * 100;
    const y    = ((e.clientY - rect.top)  / rect.height) * 100;
    setPendingPin({ x_pct: parseFloat(x.toFixed(2)), y_pct: parseFloat(y.toFixed(2)) });
    setMarkerForm({ label: '', description: '', color: '#B5651D', booth_id: '' });
    setEditMarker(null);
  }

  async function saveMarker() {
    if (!markerForm.label) return;
    if (editMarker) {
      await fetch(`/api/map-markers/${editMarker.id}`, {
        method: 'PUT', headers: adminHeaders(token),
        body: JSON.stringify({ ...markerForm, x_pct: editMarker.x_pct, y_pct: editMarker.y_pct }),
      });
    } else if (pendingPin) {
      await fetch('/api/map-markers', {
        method: 'POST', headers: adminHeaders(token),
        body: JSON.stringify({ ...markerForm, ...pendingPin }),
      });
    }
    const updated = await fetch('/api/map-markers').then(r => r.json());
    setMarkers(updated);
    setPendingPin(null); setEditMarker(null);
  }

  async function deleteMarker(id) {
    if (!confirm('마커를 삭제할까요?')) return;
    await fetch(`/api/map-markers/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
    setMarkers(m => m.filter(x => x.id !== id));
    if (editMarker?.id === id) setEditMarker(null);
  }

  const showForm = pendingPin || editMarker;

  return (
    <div>
      <h2 className="admin-section-title">지도 관리</h2>
      <div className="card">
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
          지도 이미지를 업로드하세요. 업로드 후 지도를 클릭해 마커를 추가할 수 있습니다.
        </p>
        <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
          {uploading ? '업로드 중...' : '🖼️ 이미지 업로드'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadImage} />
        </label>
      </div>

      {mapImage && (
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8 }}>지도를 클릭하면 해당 위치에 마커를 추가합니다.</p>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', cursor: 'crosshair' }}>
            <img ref={imgRef} src={mapImage} alt="지도" style={{ width: '100%', display: 'block', borderRadius: 8, userSelect: 'none' }} draggable={false} onClick={handleMapClick} />
            {markers.map(m => (
              <button
                key={m.id}
                className="map-pin"
                style={{ left: `${m.x_pct}%`, top: `${m.y_pct}%`, borderColor: m.color }}
                onClick={e => { e.stopPropagation(); setPendingPin(null); setEditMarker(m); setMarkerForm({ label: m.label, description: m.description || '', color: m.color, booth_id: m.booth_id || '' }); }}
                title={m.label}
              >
                <span className="map-pin-dot" style={{ background: m.color }} />
              </button>
            ))}
            {pendingPin && (
              <div className="map-pin" style={{ left: `${pendingPin.x_pct}%`, top: `${pendingPin.y_pct}%`, borderColor: markerForm.color, pointerEvents: 'none' }}>
                <span className="map-pin-dot" style={{ background: markerForm.color, opacity: 0.6 }} />
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>{editMarker ? '마커 수정' : '새 마커 추가'}</h3>
          <div className="input-wrap">
            <label>라벨 *</label>
            <input value={markerForm.label} onChange={e => setMarkerForm(f => ({ ...f, label: e.target.value }))} placeholder="예: 과학실험 부스" />
          </div>
          <div className="input-wrap">
            <label>설명</label>
            <input value={markerForm.description} onChange={e => setMarkerForm(f => ({ ...f, description: e.target.value }))} placeholder="클릭 시 보여줄 설명" />
          </div>
          <div className="input-wrap">
            <label>연결 부스 (선택)</label>
            <select className="admin-select" value={markerForm.booth_id} onChange={e => setMarkerForm(f => ({ ...f, booth_id: e.target.value }))}>
              <option value="">없음</option>
              {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="input-wrap" style={{ marginBottom: 12 }}>
            <label>색상</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {PIN_COLORS.map(c => (
                <button key={c} onClick={() => setMarkerForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: markerForm.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMarker}>저장</button>
            {editMarker && <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => deleteMarker(editMarker.id)}>삭제</button>}
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setPendingPin(null); setEditMarker(null); }}>취소</button>
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>등록된 마커 ({markers.length})</h3>
          {markers.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{m.label}</span>
              <button onClick={() => { setEditMarker(m); setMarkerForm({ label: m.label, description: m.description || '', color: m.color, booth_id: m.booth_id || '' }); setPendingPin(null); }}
                style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
              <button onClick={() => deleteMarker(m.id)}
                style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 부스 아이콘 선택기 ─────────────────────────────────────
function IconPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {BOOTH_ICON_OPTIONS.map(ic => (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            title={ic}
            style={{
              width: 34, height: 34, fontSize: '1.15rem', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${value === ic ? 'var(--primary)' : 'var(--border)'}`,
              background: value === ic ? 'var(--primary-lt)' : '#fff',
            }}
          >
            {ic}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value.trim().slice(0, 8))}
          placeholder="직접 입력 (이모지 1개)"
          style={{ flex: 1 }}
        />
        {value && (
          <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => onChange('')}>
            초기화
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 부스 탭 ──────────────────────────────────────────────
function BoothsTab({ token }) {
  const [booths,      setBooths]      = useState([]);
  const [editing,     setEditing]     = useState(null);
  const [adding,      setAdding]      = useState(false);
  const [form,        setForm]        = useState({ name: '', club_name: '', description: '', location: '', floor: '1', icon: '', category: '', image_url: '' });
  const [uploading,   setUploading]   = useState(false);
  const [importing,   setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importErr,   setImportErr]   = useState('');
  const [copiedId,    setCopiedId]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [floorFilter, setFloorFilter] = useState('');

  const loadBooths = () =>
    fetch('/api/admin/booths', { headers: adminHeaders(token) }).then(r => r.json()).then(setBooths);

  useEffect(() => { loadBooths(); }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const filteredBooths = booths
    .filter(b => !floorFilter || (floorFilter === PARTNER_CATEGORY ? b.category === PARTNER_CATEGORY : b.floor === floorFilter))
    .filter(b => !search.trim() || [b.name, b.club_name, b.location].some(v => v?.toLowerCase().includes(search.trim().toLowerCase())));

  function boothDisplayUrl(b) {
    return `${window.location.origin}/booth?id=${b.id}&key=${b.display_key}`;
  }

  async function copyBoothUrl(b) {
    try {
      await navigator.clipboard.writeText(boothDisplayUrl(b));
      setCopiedId(b.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      prompt('아래 링크를 복사하세요:', boothDisplayUrl(b));
    }
  }

  async function uploadImage(e, boothId) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/upload/booth?id=${boothId}`, { method: 'POST', headers: { Authorization: `AdminBearer ${token}` }, body: fd });
    const d   = await res.json();
    if (res.ok) {
      set('image_url', d.path.split('?')[0]);
      setBooths(bs => bs.map(b => b.id === boothId ? { ...b, image_url: d.path.split('?')[0] } : b));
    }
    setUploading(false);
  }

  async function save() {
    if (!form.name) return;
    if (editing) {
      await fetch(`/api/admin/booths/${editing}`, {
        method: 'PUT', headers: adminHeaders(token), body: JSON.stringify(form),
      });
      setBooths(bs => bs.map(b => b.id === editing ? { ...b, ...form } : b));
    }
    setEditing(null);
  }

  function startAdd() {
    setEditing(null);
    setForm({ name: '', club_name: '', description: '', location: '', floor: floorFilter === PARTNER_CATEGORY ? '1' : (floorFilter || '1'), icon: '', category: floorFilter === PARTNER_CATEGORY ? PARTNER_CATEGORY : '', image_url: '' });
    setAdding(true);
  }

  async function createBooth() {
    if (!form.name.trim()) return;
    const res = await fetch('/api/admin/booths', {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error || '부스 추가에 실패했습니다.'); return; }
    setBooths(bs => [...bs, d]);
    setAdding(false);
    setEditing(d.id);
    setForm({ name: d.name, club_name: d.club_name, description: d.description, location: d.location, floor: d.floor, icon: d.icon || '', category: d.category || '', image_url: d.image_url });
  }

  async function deleteBooth(b) {
    if (!confirm(`"${b.name}" 부스를 삭제할까요?\n부스 화면 접속키와 관련 스탬프 기록도 함께 삭제됩니다.`)) return;
    await fetch(`/api/admin/booths/${b.id}`, { method: 'DELETE', headers: adminHeaders(token) });
    setBooths(bs => bs.filter(x => x.id !== b.id));
    if (editing === b.id) setEditing(null);
  }

  async function downloadCSV() {
    const res  = await fetch('/api/admin/booths/import', { headers: { Authorization: `AdminBearer ${token}` } });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'booths.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setImportErr(''); setImportResult(null);
    const fd = new FormData();
    fd.append('csv', file);
    try {
      const res = await fetch('/api/admin/booths/import', {
        method: 'POST', headers: { Authorization: `AdminBearer ${token}` }, body: fd,
      });
      const d = await res.json();
      if (!res.ok) { setImportErr(d.error); return; }
      setImportResult(d);
      await loadBooths();
    } catch { setImportErr('업로드에 실패했습니다.'); }
    finally { setImporting(false); e.target.value = ''; }
  }

  return (
    <div>
      <h2 className="admin-section-title">부스 관리</h2>

      {/* CSV 동기화 */}
      <div className="card">
        <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 10 }}>CSV로 부스 일괄 동기화</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
          CSV 형식: <code>id,name,club_name,location,floor,icon,category,description</code><br />
          floor는 B1, 1, 2, 3 중 하나 (비어있거나 잘못된 값이면 1층으로 저장) · icon은 이모지 1개(선택, 비워두면 기본 아이콘 사용) · category는 partner 또는 빈 칸({PARTNER_CATEGORY_LABEL} 부스면 partner) · id가 빈 칸이면 새 부스 추가, id가 있으면 해당 부스 업데이트
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ flex: 1, padding: '10px 14px', fontSize: '0.82rem' }} onClick={downloadCSV}>
            ⬇️ 현재 목록 CSV 다운로드
          </button>
          <label className="btn btn-primary" style={{ flex: 1, padding: '10px 14px', fontSize: '0.82rem', cursor: 'pointer' }}>
            {importing ? '처리 중...' : '⬆️ CSV 업로드 & 동기화'}
            <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
          </label>
        </div>
        {importErr && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: 10 }}>{importErr}</p>}
        {importResult && (
          <div style={{ marginTop: 12, background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', fontSize: '0.82rem', color: '#166534' }}>
            ✅ 새로 추가: {importResult.created.length}개 / 업데이트: {importResult.updated.length}개
            {importResult.created.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {importResult.created.map(b => (
                  <div key={b.id} style={{ background: '#fff', borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: '0.78rem' }}>
                    [{b.id}] {b.name} — 접속키: <strong style={{ fontFamily: 'monospace' }}>{b.display_key}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 부스 목록 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>
          부스 목록 ({filteredBooths.length}{(search.trim() || floorFilter) ? ` / ${booths.length}` : ''}개)
        </p>
        {!adding && (
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={startAdd}>
            + 새 부스 추가
          </button>
        )}
      </div>

      {/* 층별 필터 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
        {[{ value: '', label: '전체' }, ...FLOORS, { value: PARTNER_CATEGORY, label: `🤝 ${PARTNER_CATEGORY_LABEL}` }].map(f => (
          <button
            key={f.value}
            onClick={() => setFloorFilter(f.value)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${floorFilter === f.value ? 'var(--primary)' : 'var(--border)'}`,
              background: floorFilter === f.value ? 'var(--primary)' : '#fff',
              color: floorFilter === f.value ? '#fff' : 'var(--muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {booths.length > 6 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 부스명, 동아리명, 위치로 검색"
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10 }}
        />
      )}

      {adding && (
        <div className="card" style={{ marginBottom: 10, border: '2px solid var(--primary)' }}>
          <div className="input-wrap">
            <label>부스 이름</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 물리화학반 부스" autoFocus />
          </div>
          <div className="input-wrap">
            <label>동아리명</label>
            <input value={form.club_name} onChange={e => set('club_name', e.target.value)} placeholder="예: 물리화학반" />
          </div>
          <div className="input-wrap">
            <label>설명</label>
            <textarea className="call-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="input-wrap">
            <label>위치</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="예: 2-12 (배치도 지도 코드와 동일하게)" />
          </div>
          <div className="input-wrap">
            <label>층</label>
            <select className="admin-select" value={form.floor} onChange={e => set('floor', e.target.value)}>
              {FLOORS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="input-wrap" style={{ marginBottom: 10 }}>
            <label>부스 아이콘</label>
            <IconPicker value={form.icon} onChange={v => set('icon', v)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.category === PARTNER_CATEGORY} onChange={e => set('category', e.target.checked ? PARTNER_CATEGORY : '')} />
            🤝 {PARTNER_CATEGORY_LABEL} 부스로 등록
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>이미지는 추가한 뒤 목록에서 등록할 수 있어요. 아이콘을 지정하지 않으면 이미지가 없을 때 기본 아이콘이 순서대로 표시됩니다.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={createBooth}>추가</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAdding(false)}>취소</button>
          </div>
        </div>
      )}

      {(search.trim() || floorFilter) && filteredBooths.length === 0 && (
        <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: '0.85rem' }}>해당 조건의 부스가 없습니다.</p>
      )}

      {filteredBooths.map(b => (
        <div key={b.id} className="card" style={{ marginBottom: 10 }}>
          {editing === b.id ? (
            <>
              <div style={{ marginBottom: 14 }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="부스 이미지" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />
                ) : (
                  <div style={{ width: '100%', height: 100, background: '#F2EAD9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>이미지 없음</div>
                )}
                <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: '0.82rem', padding: '8px 14px' }}>
                  {uploading ? '업로드 중...' : '🖼️ 이미지 변경'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadImage(e, b.id)} />
                </label>
              </div>
              <div className="input-wrap">
                <label>부스 이름</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="input-wrap">
                <label>동아리명</label>
                <input value={form.club_name} onChange={e => set('club_name', e.target.value)} placeholder="예: 물리화학반" />
              </div>
              <div className="input-wrap">
                <label>설명</label>
                <textarea className="call-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="input-wrap">
                <label>위치</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="예: 2-12 (배치도 지도 코드와 동일하게)" />
              </div>
              <div className="input-wrap">
                <label>층</label>
                <select className="admin-select" value={form.floor} onChange={e => set('floor', e.target.value)}>
                  {FLOORS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="input-wrap" style={{ marginBottom: 12 }}>
                <label>부스 아이콘</label>
                <IconPicker value={form.icon} onChange={v => set('icon', v)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.category === PARTNER_CATEGORY} onChange={e => set('category', e.target.checked ? PARTNER_CATEGORY : '')} />
                🤝 {PARTNER_CATEGORY_LABEL} 부스로 등록
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>저장</button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(null)}>취소</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#F2EAD9' }}>
                  {b.image_url
                    ? <img src={b.image_url} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{b.icon || '🏪'}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-lt)', borderRadius: 100, padding: '1px 8px', flexShrink: 0 }}>
                      {FLOORS.find(f => f.value === b.floor)?.label ?? '1층'}
                    </span>
                    {b.category === PARTNER_CATEGORY && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff', background: '#8B5CF6', borderRadius: 100, padding: '1px 8px', flexShrink: 0 }}>
                        🤝 협업
                      </span>
                    )}
                  </div>
                  {b.club_name  && <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 1 }}>🎪 {b.club_name}</div>}
                  {b.description && <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>{b.description}</div>}
                  {b.location   && <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 2 }}>📍 {b.location}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
                  <button
                    onClick={() => { setAdding(false); setEditing(b.id); setForm({ name: b.name, club_name: b.club_name || '', description: b.description || '', location: b.location || '', floor: b.floor || '1', icon: b.icon || '', category: b.category || '', image_url: b.image_url || '' }); }}
                    style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteBooth(b)}
                    style={{ fontSize: '0.82rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {b.display_key && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    부스 화면 접속키: <strong style={{ fontFamily: 'monospace' }}>{b.display_key}</strong>
                  </span>
                  <a
                    href={`/booth?id=${b.id}&key=${b.display_key}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: 'auto' }}
                  >
                    🎪 부스 화면 열기
                  </a>
                  <button
                    onClick={() => copyBoothUrl(b)}
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    {copiedId === b.id ? '✅ 복사됨' : '🔗 링크 복사'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 공연 탭 ──────────────────────────────────────────────
function PerformanceForm({ form, set, save, onCancel }) {
  return (
    <>
      <div className="input-wrap">
        <label>공연 제목 *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="예: 오프닝 공연" />
      </div>
      <div className="input-wrap">
        <label>출연자/팀명</label>
        <input value={form.performer} onChange={e => set('performer', e.target.value)} placeholder="예: 학생 밴드" />
      </div>
      <div className="input-wrap">
        <label>장소</label>
        <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="예: 강당" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="input-wrap">
          <label>시작 시간 *</label>
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
        </div>
        <div className="input-wrap">
          <label>종료 시간</label>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </div>
      </div>
      <div className="input-wrap" style={{ marginBottom: 12 }}>
        <label>설명</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>저장</button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>취소</button>
      </div>
    </>
  );
}

function PerformancesTab({ token }) {
  const [perfs,   setPerfs]   = useState([]);
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState({ title: '', performer: '', location: '', start_time: '', end_time: '', description: '' });
  const [notice,  setNotice]  = useState('');
  const [noticeSaved, setNoticeSaved] = useState(false);

  useEffect(() => {
    fetch('/api/performances').then(r => r.json()).then(setPerfs);
    fetch('/api/settings').then(r => r.json()).then(s => setNotice(s.performance_notice || ''));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function saveNotice() {
    await fetch('/api/settings', { method: 'PUT', headers: adminHeaders(token), body: JSON.stringify({ performance_notice: notice }) });
    setNoticeSaved(true);
    setTimeout(() => setNoticeSaved(false), 2000);
  }

  async function save() {
    if (!form.title || !form.start_time) return;
    if (editing) {
      await fetch(`/api/performances/${editing}`, { method: 'PUT', headers: adminHeaders(token), body: JSON.stringify(form) });
      setPerfs(ps => ps.map(p => p.id === editing ? { ...p, ...form } : p));
      setEditing(null);
    } else {
      const res = await fetch('/api/performances', { method: 'POST', headers: adminHeaders(token), body: JSON.stringify(form) });
      const d   = await res.json();
      setPerfs(ps => [...ps, { id: d.id, ...form }]);
      setAdding(false);
    }
    setForm({ title: '', performer: '', location: '', start_time: '', end_time: '', description: '' });
  }

  async function del(id) {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/performances/${id}`, { method: 'DELETE', headers: adminHeaders(token) });
    setPerfs(ps => ps.filter(p => p.id !== id));
  }

  function cancelForm() { setAdding(false); setEditing(null); }

  return (
    <div>
      {/* 공연 안내사항 */}
      <h2 className="admin-section-title">공연 안내사항</h2>
      <div className="card">
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 10 }}>
          공연 탭 상단에 표시되는 안내사항입니다. (비워두면 표시 안 됨)
        </p>
        <div className="input-wrap" style={{ marginBottom: 12 }}>
          <textarea
            className="call-textarea"
            rows={3}
            value={notice}
            onChange={e => setNotice(e.target.value)}
            placeholder="예: 공연 중 음식 섭취는 삼가 주세요. 앞줄 자리는 선착순입니다."
          />
        </div>
        <button className="btn btn-primary" onClick={saveNotice}>{noticeSaved ? '✅ 저장됨' : '안내사항 저장'}</button>
      </div>

      <h2 className="admin-section-title">공연 일정</h2>
      {!adding && !editing && (
        <div style={{ padding: '0 16px 16px' }}>
          <button className="btn btn-primary" onClick={() => { setAdding(true); setForm({ title: '', performer: '', location: '', start_time: '', end_time: '', description: '' }); }}>
            + 공연 추가
          </button>
        </div>
      )}
      {adding && <div className="card"><PerformanceForm form={form} set={set} save={save} onCancel={cancelForm} /></div>}
      {perfs.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 10 }}>
          {editing === p.id ? <PerformanceForm form={form} set={set} save={save} onCancel={cancelForm} /> : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                {p.performer && <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>👤 {p.performer}</div>}
                <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: 2 }}>
                  ⏰ {p.start_time}{p.end_time ? ` — ${p.end_time}` : ''}
                  {p.location && ` · 📍 ${p.location}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditing(p.id); setAdding(false); setForm({ title: p.title, performer: p.performer || '', location: p.location || '', start_time: p.start_time, end_time: p.end_time || '', description: p.description || '' }); }}
                  style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                <button onClick={() => del(p.id)} style={{ fontSize: '0.82rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 공지 탭 ──────────────────────────────────────────────
function NoticesTab({ token }) {
  const [text,   setText]   = useState('');
  const [active, setActive] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setText(s.announcement        || '');
      setActive(s.announcement_active === '1');
    });
  }, []);

  async function save() {
    setLoading(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: adminHeaders(token),
      body: JSON.stringify({ announcement: text, announcement_active: active ? '1' : '0' }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  }

  async function toggle() {
    const next = !active;
    setActive(next);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: adminHeaders(token),
      body: JSON.stringify({ announcement_active: next ? '1' : '0' }),
    });
  }

  return (
    <div>
      <h2 className="admin-section-title">전체 공지 배너</h2>
      <div className="card">
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
          활성화되면 <strong>모든 화면 최상단</strong>에 빨간 공지 배너가 표시됩니다.<br />
          최대 30초 이내에 반영됩니다.
        </p>

        {/* 미리보기 */}
        {text && (
          <div style={{
            background:   '#EF4444',
            color:        '#fff',
            borderRadius: 10,
            padding:      '10px 14px',
            marginBottom: 14,
            fontSize:     '0.82rem',
            fontWeight:   600,
          }}>
            📢 {text}
            <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: 8 }}>(미리보기)</span>
          </div>
        )}

        <div className="input-wrap">
          <label>공지 내용</label>
          <textarea
            className="call-textarea"
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="예: 오후 2시부터 강당 공연이 시작됩니다. 많은 참여 바랍니다!"
          />
        </div>

        {/* 활성화 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 14px', background: active ? '#FEF2F2' : '#F9FAFB', borderRadius: 12, border: `1.5px solid ${active ? '#FCA5A5' : 'var(--border)'}` }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: active ? '#DC2626' : 'var(--muted)' }}>
              {active ? '🔴 공지 활성화 중' : '⚫ 공지 비활성화'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
              {active ? '모든 화면에 배너가 표시됩니다' : '배너가 숨겨진 상태입니다'}
            </div>
          </div>
          <button
            onClick={toggle}
            style={{
              padding:      '8px 18px',
              borderRadius: 10,
              border:       'none',
              background:   active ? '#DC2626' : '#B5651D',
              color:        '#fff',
              fontWeight:   700,
              fontSize:     '0.82rem',
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            {active ? '비활성화' : '활성화'}
          </button>
        </div>

        <button className="btn btn-primary" onClick={save} disabled={loading}>
          {saved ? '✅ 저장됨' : '저장'}
        </button>
      </div>
    </div>
  );
}

// ─── 메인 어드민 페이지 ────────────────────────────────────
export default function AdminPage() {
  const [token,     setToken]     = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  function onLogin(t) {
    sessionStorage.setItem('admin_token', t);
    setToken(t);
  }

  if (!token) return <LoginScreen onLogin={onLogin} />;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--primary)', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🔐 어드민</h1>
          <a href="/admin/pc" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
            🖥️ PC 버전 (코드 발급/인쇄)
          </a>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('admin_token'); setToken(null); }}
          style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: '#fff' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding:      '10px 14px',
              border:       'none',
              background:   'none',
              fontSize:     '0.78rem',
              fontWeight:   activeTab === t.id ? 700 : 400,
              color:        activeTab === t.id ? 'var(--primary)' : 'var(--muted)',
              borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 4 }}>
        {activeTab === 'info'         && <InfoTab         token={token} />}
        {activeTab === 'map'          && <MapTab          token={token} />}
        {activeTab === 'booths'       && <BoothsTab       token={token} />}
        {activeTab === 'performances' && <PerformancesTab token={token} />}
        {activeTab === 'notices'      && <NoticesTab      token={token} />}
      </div>
    </div>
  );
}
