'use client';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [s, setS] = useState({});

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setS).catch(() => {});
  }, []);

  const hasContent = s.footer_org_name || s.footer_address || s.footer_contact || s.footer_extra;
  if (!hasContent) return null;

  return (
    <footer style={{
      marginTop:  24,
      padding:    '28px 20px 24px',
      textAlign:  'center',
      color:      '#9C8F7A',
      fontSize:   '0.74rem',
      lineHeight: 1.9,
      borderTop:  '1px solid #E8DFCF',
    }}>
      {s.footer_org_name && <div style={{ fontWeight: 700, color: '#7A6E5D', marginBottom: 2 }}>{s.footer_org_name}</div>}
      {s.footer_address  && <div>{s.footer_address}</div>}
      {s.footer_contact  && <div>{s.footer_contact}</div>}
      {s.footer_extra    && <div>{s.footer_extra}</div>}
      {s.footer_org_name && <div style={{ marginTop: 8 }}>© {new Date().getFullYear()} Sojak Studio. All rights reserved.</div>}
    </footer>
  );
}
