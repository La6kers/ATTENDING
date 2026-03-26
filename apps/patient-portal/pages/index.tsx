// ============================================================
// ATTENDING AI — Patient App Landing
// Pure inline-styled landing — no Tailwind dependency on index
// ============================================================

import Head from 'next/head';

const cards = [
  { href: '/compass', label: 'COMPASS Assessment', desc: 'Start a pre-visit health assessment', icon: '🩺', bg: 'rgba(255,107,90,0.2)', color: '#FF6B5A' },
  { href: '/home', label: 'Health Dashboard', desc: 'View vitals, labs, and appointments', icon: '💓', bg: 'rgba(26,143,168,0.3)', color: '#4FD1C5' },
  { href: '/messages', label: 'Messages', desc: 'Secure messaging with your care team', icon: '💬', bg: 'rgba(59,130,246,0.2)', color: '#93C5FD' },
  { href: '/emergency/access-settings', label: 'Emergency Access', desc: 'Crash detection and emergency records', icon: '🛡️', bg: 'rgba(239,68,68,0.2)', color: '#FCA5A5' },
  { href: '/health/appointments', label: 'Appointments', desc: 'Upcoming and past visits', icon: '📅', bg: 'rgba(168,85,247,0.2)', color: '#C4B5FD' },
  { href: '/health-summary', label: 'Health Records', desc: 'Medical history and documents', icon: '📋', bg: 'rgba(245,158,11,0.2)', color: '#FCD34D' },
];

export default function PatientLanding() {
  return (
    <>
      <Head><title>ATTENDING AI — Patient Portal</title></Head>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0C3547, #0C4C5E, #1A8FA8)', fontFamily: "'DM Sans', sans-serif", padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
              ❤️
            </div>
            <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>ATTENDING AI</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: 4 }}>Patient Portal</p>
          </div>

          {/* Cards */}
          {cards.map((c) => (
            <a key={c.href} href={c.href} style={{ display: 'block', textDecoration: 'none', marginBottom: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {c.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>{c.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 2 }}>{c.desc}</div>
                </div>
                <div style={{ width: 20, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
              </div>
            </a>
          ))}

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>ATTENDING AI — Secure patient portal</p>
          </div>
        </div>
      </div>
    </>
  );
}
