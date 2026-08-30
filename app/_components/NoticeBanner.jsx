'use client';
import { useState, useEffect } from 'react';

export default function NoticeBanner() {
  const [notice, setNotice] = useState(null);

  async function fetchNotice() {
    try {
      const res = await fetch('/api/notices');
      const d   = await res.json();
      setNotice(d.active && d.content ? d.content : null);
    } catch {}
  }

  useEffect(() => {
    fetchNotice();
    const id = setInterval(fetchNotice, 30000);
    return () => clearInterval(id);
  }, []);

  if (!notice) return null;

  return (
    <div style={{
      position:        'sticky',
      top:             0,
      left:            0,
      right:           0,
      zIndex:          9999,
      background:      'linear-gradient(90deg, #DC2626, #EF4444)',
      color:           '#fff',
      padding:         '10px 16px',
      textAlign:       'center',
      fontSize:        '0.875rem',
      fontWeight:      600,
      lineHeight:      1.4,
      boxShadow:       '0 2px 8px rgba(0,0,0,0.2)',
      wordBreak:       'keep-all',
    }}>
      📢 {notice}
    </div>
  );
}
