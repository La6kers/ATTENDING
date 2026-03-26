import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDING AI — attendingai.health Landing Page v7
// Contrast rhythm: teal dark sections ↔ clean light sections
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  headerDark: "#0C4C5E",
  midTeal: "#0F5F76",
  primaryTeal: "#1A8FA8",
  lightTeal: "#25B8A9",
  paleMint: "#E6F7F5",
  gold: "#F0A500",
  goldDark: "#D48F00",
  coral: "#E87461",
  coralDark: "#D45A48",
  white: "#FFFFFF",
  g50: "#F8FAFC",
  g100: "#F1F5F9",
  g200: "#E2E8F0",
  g500: "#64748B",
  g700: "#334155",
};

const mono = "'JetBrains Mono', 'Fira Code', monospace";
const sans = "'DM Sans', 'Inter', system-ui, sans-serif";
const body = "'Source Sans 3', 'Inter', system-ui, sans-serif";

// Glass on dark
const gd = { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" };
// Card on light
const gl = { bg: C.white, border: `${C.primaryTeal}15` };

// ─── EKG ─────────────────────────────────────────────────────────────────────
const ekgCycle = (ox, b) => [
  `L${ox} ${b}`, `C${ox+6} ${b},${ox+10} ${b-8},${ox+16} ${b-10}`,
  `C${ox+22} ${b-12},${ox+28} ${b-8},${ox+32} ${b}`,
  `L${ox+44} ${b}`, `L${ox+48} ${b+5}`, `L${ox+54} ${b-38}`, `L${ox+60} ${b+12}`,
  `C${ox+64} ${b+4},${ox+68} ${b},${ox+72} ${b}`,
  `C${ox+80} ${b},${ox+86} ${b-14},${ox+96} ${b-16}`,
  `C${ox+106} ${b-18},${ox+114} ${b-10},${ox+120} ${b}`, `L${ox+148} ${b}`,
].join(" ");

const EKG = ({ w = 400, h = 60, color = C.coral, cycles = 2, sw = 2.5, style = {} }) => {
  const vW = 160 * cycles + 40, vH = 60, m = vH / 2 + 4;
  let d = `M0 ${m}`;
  for (let i = 0; i < cycles; i++) d += " " + ekgCycle(20 + i * 160, m);
  d += ` L${vW} ${m}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${vW} ${vH}`} fill="none" preserveAspectRatio="xMidYMid meet" style={style}>
      <path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}>
        <animate attributeName="stroke-dasharray" from={`0 ${vW*4}`} to={`${vW*4} 0`} dur="2.5s" fill="freeze" />
      </path>
    </svg>
  );
};

const Counter = ({ end, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setGo(true); }, { threshold: 0.3 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!go) return;
    let c = 0; const inc = end / 50;
    const t = setInterval(() => { c += inc; if (c >= end) { setCount(end); clearInterval(t); } else setCount(Math.floor(c)); }, 30);
    return () => clearInterval(t);
  }, [go, end]);
  return <span ref={ref}>{count}{suffix}</span>;
};

const FadeIn = ({ children, delay = 0, style = {} }) => {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.08 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`, ...style }}>{children}</div>
  );
};

const Label = ({ color = C.coral, children }) => (
  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color, fontFamily: mono, marginBottom: 12 }}>{children}</div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function AttendingAILanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: "", email: "", org: "", role: "" });
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileMenu(false); };

  const navItems = [
    { id: "mission", label: "Mission" }, { id: "features", label: "Capabilities" },
    { id: "platform", label: "Architecture" }, { id: "workflow", label: "How It Works" },
    { id: "demo", label: "Demo" }, { id: "contact", label: "Contact" },
  ];

  // shared input styles
  const inputDark = { width: "100%", padding: "9px 12px", borderRadius: 4, border: `1px solid rgba(255,255,255,0.15)`, fontSize: 13, background: "rgba(0,0,0,0.15)", color: C.white, fontFamily: body };
  const inputLight = { width: "100%", padding: "9px 12px", borderRadius: 4, border: `1px solid ${C.primaryTeal}20`, fontSize: 13, background: C.g50, color: C.midTeal, fontFamily: body };

  return (
    <div style={{ minHeight: "100vh", background: C.white, fontFamily: body }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@300;400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: ${C.coral}35; color: ${C.white}; }
        input, textarea, select { font-family: ${body}; outline: none; }
        input:focus, textarea:focus, select:focus { border-color: ${C.coral} !important; box-shadow: 0 0 0 2px ${C.coral}25 !important; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .pillar-grid, .feat-grid { flex-direction: column !important; }
          .arch-grid { grid-template-columns: 1fr !important; }
          .stats-row { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; text-align: center; }
          .nav-links { display: none !important; }
          .mobile-btn { display: flex !important; }
          .demo-layout { flex-direction: column !important; }
        }
      `}</style>

      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? `${C.midTeal}F0` : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid rgba(255,255,255,0.08)` : "none",
        transition: "all 0.3s ease", padding: scrolled ? "8px 0" : "16px 0",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(150deg, ${C.primaryTeal}, ${C.midTeal})`,
              border: `2px solid ${C.gold}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.white, fontFamily: sans }}>AI</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: "0.08em", fontFamily: sans }}>ATTENDING AI</span>
          </div>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 12px", borderRadius: 4,
                color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: "0.06em", fontFamily: mono,
              }}>{item.label}</button>
            ))}
            <button onClick={() => scrollTo("demo")} style={{
              background: `${C.coral}25`, border: `1px solid ${C.coral}60`,
              color: C.white, cursor: "pointer", padding: "6px 16px", borderRadius: 4,
              fontFamily: mono, fontWeight: 700, fontSize: 10, letterSpacing: "0.06em", marginLeft: 8,
            }}>GET EARLY ACCESS</button>
          </div>
          <button className="mobile-btn" onClick={() => setMobileMenu(!mobileMenu)} style={{
            display: "none", background: "none", border: "none",
            color: C.white, fontSize: 20, cursor: "pointer", padding: 8, fontFamily: mono,
          }}>{mobileMenu ? "\u00d7" : "\u2261"}</button>
        </div>
        {mobileMenu && (
          <div style={{ background: `${C.midTeal}F8`, backdropFilter: "blur(16px)", padding: "12px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", animation: "slideDown 0.2s ease" }}>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 0", color: "rgba(255,255,255,0.7)", fontFamily: body, fontSize: 13,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>{item.label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ━━━ HERO ━━━ midTeal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ background: C.midTeal, padding: "140px 28px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "5%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.primaryTeal}25, transparent 65%)` }} />

        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="hero-grid" style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 480px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: `${C.coral}18`, border: `1px solid ${C.coral}40`,
                borderRadius: 4, padding: "4px 14px 4px 10px", marginBottom: 24,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.coral, boxShadow: `0 0 8px ${C.coral}80` }} />
                <span style={{ color: C.white, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em" }}>NOW ACCEPTING PILOT PARTNERS</span>
              </div>

              <h1 style={{ fontFamily: sans, fontWeight: 800, fontSize: "clamp(32px, 4.5vw, 48px)", color: C.white, lineHeight: 1.1, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Clinical Intelligence</h1>
              <h1 style={{ fontFamily: sans, fontWeight: 800, fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.02em", color: C.coral }}>That Reaches Everyone</h1>

              <EKG w={280} h={36} cycles={2} style={{ marginBottom: 20, opacity: 0.85 }} />

              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, maxWidth: 480, margin: "0 0 28px" }}>
                AI-powered clinical decision support designed for <span style={{ color: C.white }}>providers</span>, built to improve outcomes for <span style={{ color: C.white }}>patients</span>, and purpose-built to transform care in <span style={{ color: C.white }}>rural communities</span> where resources are scarce but the need is greatest.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => scrollTo("demo")} style={{
                  background: `${C.coral}25`, border: `1px solid ${C.coral}65`, color: C.white, cursor: "pointer",
                  padding: "10px 28px", borderRadius: 6, fontFamily: body, fontWeight: 600, fontSize: 14, letterSpacing: "0.01em",
                }}>Schedule a Demo</button>
                <button onClick={() => scrollTo("mission")} style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: C.white, cursor: "pointer",
                  padding: "10px 28px", borderRadius: 6, fontFamily: body, fontWeight: 500, fontSize: 14, letterSpacing: "0.01em",
                }}>Our Mission \u2192</button>
              </div>
            </div>

            {/* Product preview */}
            <div style={{ flex: "1 1 400px" }}>
              <div style={{ background: gd.bg, border: `1px solid ${gd.border}`, borderRadius: 10, overflow: "hidden", backdropFilter: "blur(12px)" }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.coral }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.lightTeal }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>provider.attendingai.health</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {[
                    { label: "ACTIVE PATIENTS", value: "47", color: C.lightTeal },
                    { label: "PENDING REVIEW", value: "12", color: C.gold },
                    { label: "CRITICAL ALERTS", value: "3", color: C.coral },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: sans }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.white, letterSpacing: "0.06em" }}>RECENT ASSESSMENTS</span>
                  <span style={{ fontSize: 9, color: C.coral }}>View All \u2192</span>
                </div>
                {[
                  { id: "#1047", complaint: "Chest pain, radiating to left arm", priority: "CRITICAL", color: C.coral },
                  { id: "#1052", complaint: "Persistent cough, 3 weeks", priority: "MODERATE", color: C.gold },
                  { id: "#1053", complaint: "Follow-up, hypertension mgmt", priority: "ROUTINE", color: C.lightTeal },
                ].map((p, i, arr) => (
                  <div key={i} style={{ padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.white }}>Patient {p.id}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{p.complaint}</div>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 800, color: p.color, background: `${p.color}18`, padding: "3px 8px", borderRadius: 3, letterSpacing: "0.08em" }}>{p.priority}</span>
                  </div>
                ))}
                <div style={{ margin: 10, padding: "10px 12px", background: `${C.coral}10`, border: `1px solid ${C.coral}22`, borderRadius: 6 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: C.coral, letterSpacing: "0.1em" }}>\u26a1 AI CLINICAL ALERT</span>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginTop: 4 }}>
                    Patient #1047 red flag: Chest pain with radiation warrants urgent cardiac workup. Recommend troponin, ECG, CXR.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ STATS ━━━ coral accent bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ background: C.coral, padding: "32px 28px" }}>
        <div className="stats-row" style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { value: 30, suffix: "+", label: "CLINICAL DATA MODELS" },
            { value: 14, label: "RED FLAG PATTERNS" },
            { value: 18, label: "EMERGENCY CONDITIONS" },
            { value: 375, suffix: "+", label: "INTEGRATION TESTS" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.12)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.white, fontFamily: sans, lineHeight: 1 }}>
                <Counter end={s.value} suffix={s.suffix || ""} />
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ MISSION ━━━ paleMint (light) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="mission" style={{ background: C.paleMint, padding: "80px 28px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <Label color={C.coral}>OUR MISSION</Label>
            <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.midTeal, margin: "0 0 8px" }}>
              Better Care for <span style={{ color: C.coral }}>Every</span> Community
            </h2>
            <p style={{ fontSize: 15, color: C.g500, maxWidth: 600, lineHeight: 1.7, marginBottom: 36 }}>
              Clinical intelligence shouldn't be a luxury reserved for large urban health systems. We put advanced decision support in the hands of the providers and patients who need it most.
            </p>
          </FadeIn>

          <div className="pillar-grid" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { title: "Rural Healthcare", color: C.coral, tag: "PRIMARY FOCUS",
                desc: "Purpose-built for resource-constrained clinics where a single provider may be the entire care team. Clinical intelligence that works where specialists aren't available." },
              { title: "Providers", color: C.primaryTeal, tag: "DECISION SUPPORT",
                desc: "Evidence-based recommendations, automated order management, and real-time alerts that help you practice at the top of your license \u2014 from family medicine to emergency departments." },
              { title: "Patients", color: C.gold, tag: "PATIENT OUTCOMES",
                desc: "Guided assessments that capture your full story. Clear communication, faster triage, and the confidence that your provider has the best clinical intelligence supporting every decision." },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 100} style={{ flex: "1 1 280px" }}>
                <div style={{
                  background: i === 0 ? `${C.coral}06` : C.white,
                  border: `1px solid ${i === 0 ? C.coral + "25" : C.primaryTeal + "15"}`,
                  borderRadius: 8, padding: "24px 20px", borderLeft: `3px solid ${p.color}50`,
                }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: p.color, background: `${p.color}10`, padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 12 }}>{p.tag}</div>
                  <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 17, color: C.midTeal, margin: "0 0 8px" }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: C.g500, lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CAPABILITIES ━━━ white ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" style={{ background: C.white, padding: "80px 28px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <Label color={C.primaryTeal}>CAPABILITIES</Label>
            <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.midTeal, margin: "0 0 8px" }}>
              Enterprise-Grade, <span style={{ color: C.coral }}>Clinically</span> Driven
            </h2>
            <p style={{ fontSize: 15, color: C.g500, maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
              Every feature designed around clinical safety, provider workflow, and patient outcomes.
            </p>
          </FadeIn>

          <div className="feat-grid" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { title: "AI Clinical Decision Support", desc: "Evidence-based diagnostic recommendations with calibrated confidence scoring. Every suggestion traceable to published guidelines.", color: C.coral },
              { title: "Intelligent Order Management", desc: "Lab, imaging, medication, and referral orders with CPT/LOINC coding, interaction checking, and clinical catalog workflows.", color: C.primaryTeal },
              { title: "Real-Time Clinical Alerts", desc: "14 red flag patterns and 18 emergency protocols. Critical findings trigger instant provider notifications via SignalR.", color: C.coral },
              { title: "Structured Assessments", desc: "18-phase OLDCARTS workflow via XState state machines. Systematic history-taking that captures clinical nuance.", color: C.gold },
              { title: "HIPAA-Ready Security", desc: "AES-256-GCM encryption, multi-tenant isolation, PHI-safe logging, comprehensive audit trails, Azure AD B2C authentication.", color: C.primaryTeal },
              { title: "Provider & Patient Portals", desc: "Dual-portal architecture \u2014 clinical command center for providers, guided assessments for patients, unified data layer.", color: C.lightTeal },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 60} style={{ flex: "1 1 290px" }}>
                <div style={{
                  background: C.g50, border: `1px solid ${C.g200}`,
                  borderLeft: `3px solid ${f.color}50`, borderRadius: 8, padding: "20px 18px",
                }}>
                  <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.midTeal, margin: "0 0 6px" }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: C.g500, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ ARCHITECTURE ━━━ midTeal (dark) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="platform" style={{ background: C.midTeal, padding: "80px 28px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <Label color={C.coral}>ARCHITECTURE</Label>
            <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.white, margin: "0 0 8px" }}>
              Production-Hardened <span style={{ color: C.coral }}>Infrastructure</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
              Clean Architecture, CQRS patterns, comprehensive observability. Built for healthcare compliance from day one.
            </p>
          </FadeIn>

          <div className="arch-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { title: "Clean Architecture", items: [".NET 8 \u00b7 Domain-Driven Design", "MediatR CQRS pipeline", "EF Core + SQL Server", "Full separation of concerns"], color: C.lightTeal },
              { title: "Observability Stack", items: ["OpenTelemetry distributed tracing", "Clinical SLA monitoring (150ms critical)", "Structured logging \u00b7 PHI safety", "k6 load testing \u00b7 clinical patterns"], color: C.coral },
              { title: "Security Posture", items: ["Multi-tenant data isolation", "AES-256-GCM field encryption", "Rate limiting \u00b7 CSRF protection", "SQL injection detection layer"], color: C.gold },
              { title: "Integration Ready", items: ["FHIR R4 standards compliance", "SignalR real-time notifications", "Azure cloud-native deployment", "REST + WebSocket API surface"], color: C.coral },
            ].map((block, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: gd.bg, border: `1px solid ${gd.border}`, borderRadius: 8, padding: "20px 18px", borderLeft: `3px solid ${block.color}50` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: block.color, marginBottom: 12 }}>{block.title.toUpperCase()}</div>
                  {block.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: j < block.items.length - 1 ? 8 : 0 }}>
                      <span style={{ color: block.color, fontSize: 8, flexShrink: 0 }}>\u2192</span>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ WORKFLOW ━━━ paleMint (light) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="workflow" style={{ background: C.paleMint, padding: "80px 28px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <Label color={C.coral}>HOW IT WORKS</Label>
            <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.midTeal, margin: "0 0 8px" }}>
              Patient Intake to <span style={{ color: C.coral }}>Clinical Action</span>
            </h2>
            <p style={{ fontSize: 15, color: C.g500, maxWidth: 500, lineHeight: 1.7, marginBottom: 36 }}>
              A seamless workflow supporting providers and patients at every decision point.
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <div style={{ background: C.white, border: `1px solid ${C.primaryTeal}15`, borderTop: `2px solid ${C.coral}50`, borderRadius: 8, padding: "28px 24px" }}>
              {[
                { title: "Patient Completes Assessment", desc: "Structured 18-phase OLDCARTS workflow captures chief complaint, timeline, severity, and context through a guided conversational interface." },
                { title: "AI Analyzes Clinical Context", desc: "Assessment data processed against clinical decision rules, red flag patterns, and evidence-based guidelines. Critical findings flagged immediately." },
                { title: "Provider Reviews with Intelligence", desc: "Prioritized assessments with AI-generated differentials, confidence scores, and supporting evidence. Critical cases surface first with real-time alerts." },
                { title: "Order with Confidence", desc: "Lab, imaging, medication, and referral orders powered by clinical catalogs with CPT/LOINC coding. Interaction checks and complete audit trail." },
                { title: "Continuous Monitoring", desc: "Track patient outcomes, review recommendation accuracy, receive real-time notifications. Every action auditable, every decision traceable." },
              ].map((step, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: i < 2 ? `${C.coral}10` : `${C.primaryTeal}10`,
                      border: `1px solid ${i < 2 ? C.coral + "30" : C.primaryTeal + "20"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: i < 2 ? C.coral : C.primaryTeal, flexShrink: 0,
                    }}>{i + 1}</div>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 24, background: `${C.primaryTeal}18` }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 24 : 0, paddingTop: 2 }}>
                    <h4 style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.midTeal, margin: "0 0 4px" }}>{step.title}</h4>
                    <p style={{ fontSize: 14, color: C.g500, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ━━━ DEMO ━━━ midTeal (dark) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="demo" style={{ background: C.midTeal, padding: "80px 28px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <div className="demo-layout" style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 400px" }}>
                <Label color={C.coral}>PILOT PROGRAM</Label>
                <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.white, margin: "0 0 12px" }}>
                  See ATTENDING AI in Action
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 28 }}>
                  We're partnering with healthcare organizations of all sizes \u2014 from rural clinics to regional health systems. Schedule a personalized demo to see how ATTENDING AI works for your team.
                </p>
                {[
                  "Personalized walkthrough of the provider portal",
                  "Live demonstration of AI clinical assessment",
                  "Architecture deep-dive for your IT team",
                  "Integration discussion for your existing EHR",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: C.coral, fontSize: 9, flexShrink: 0 }}>\u2192</span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: "1 1 380px", background: gd.bg, border: `1px solid ${gd.border}`, borderRadius: 8, padding: 28, backdropFilter: "blur(8px)" }}>
                {demoSubmitted ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.coral, marginBottom: 12 }}>\u2713 DEMO REQUESTED</div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>We'll reach out within 24 hours to schedule your personalized walkthrough.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.white, letterSpacing: "0.06em", marginBottom: 20 }}>SCHEDULE YOUR DEMO</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {[
                        { key: "name", label: "FULL NAME", placeholder: "Dr. Jane Smith", type: "text" },
                        { key: "email", label: "WORK EMAIL", placeholder: "jane@clinic.org", type: "email" },
                        { key: "org", label: "ORGANIZATION", placeholder: "Your healthcare facility", type: "text" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label style={{ display: "block", marginBottom: 5, fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>{f.label}</label>
                          <input type={f.type} placeholder={f.placeholder} value={demoForm[f.key]} onChange={(e) => setDemoForm({ ...demoForm, [f.key]: e.target.value })} style={inputDark} />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: "block", marginBottom: 5, fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>YOUR ROLE</label>
                        <select value={demoForm.role} onChange={(e) => setDemoForm({ ...demoForm, role: e.target.value })}
                          style={{ ...inputDark, color: demoForm.role ? C.white : "rgba(255,255,255,0.4)", appearance: "auto" }}>
                          <option value="">Select your role...</option>
                          <option value="physician">Physician / Provider</option>
                          <option value="admin">Clinic Administrator</option>
                          <option value="it">IT / Technical Lead</option>
                          <option value="nursing">Nursing / Clinical Staff</option>
                          <option value="executive">Executive Leadership</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <button onClick={() => setDemoSubmitted(true)} style={{
                        width: "100%", padding: "10px 24px", borderRadius: 6,
                        background: `${C.coral}28`, border: `1px solid ${C.coral}60`,
                        color: C.white, cursor: "pointer", fontFamily: mono, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", marginTop: 4,
                      }}>REQUEST DEMO</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ━━━ CONTACT ━━━ white (light) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="contact" style={{ background: C.white, padding: "80px 28px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <FadeIn>
            <Label color={C.primaryTeal}>CONTACT</Label>
            <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 28, color: C.midTeal, margin: "0 0 8px" }}>Get in Touch</h2>
            <p style={{ fontSize: 15, color: C.g500, lineHeight: 1.7, marginBottom: 28 }}>
              Questions about the platform, partnership opportunities, or pilot program eligibility?
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <div style={{ background: C.g50, border: `1px solid ${C.g200}`, borderRadius: 8, padding: 28 }}>
              {contactSubmitted ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: C.primaryTeal, marginBottom: 12 }}>\u2713 MESSAGE SENT</div>
                  <p style={{ fontSize: 14, color: C.g500 }}>We'll respond within one business day.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[{ key: "name", label: "NAME", placeholder: "Your name" }, { key: "email", label: "EMAIL", placeholder: "you@org.com" }].map((f) => (
                      <div key={f.key} style={{ flex: "1 1 200px" }}>
                        <label style={{ display: "block", marginBottom: 5, fontSize: 8, fontWeight: 700, color: C.g500, letterSpacing: "0.1em" }}>{f.label}</label>
                        <input placeholder={f.placeholder} value={contactForm[f.key]} onChange={(e) => setContactForm({ ...contactForm, [f.key]: e.target.value })} style={inputLight} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: 8, fontWeight: 700, color: C.g500, letterSpacing: "0.1em" }}>MESSAGE</label>
                    <textarea placeholder="Tell us about your facility..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      rows={4} style={{ ...inputLight, resize: "vertical" }} />
                  </div>
                  <button onClick={() => setContactSubmitted(true)} style={{
                    width: "100%", padding: "10px 24px", borderRadius: 6,
                    background: `${C.coral}12`, border: `1px solid ${C.coral}35`,
                    color: C.coral, cursor: "pointer", fontFamily: mono, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em",
                  }}>SEND MESSAGE</button>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ headerDark ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background: C.headerDark, padding: "48px 28px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(150deg, ${C.primaryTeal}, ${C.midTeal})`, border: `1.5px solid ${C.gold}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: C.white, fontFamily: sans }}>AI</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.white, letterSpacing: "0.08em", fontFamily: sans }}>ATTENDING AI</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 260 }}>
                AI-powered clinical decision support for providers, patients, and rural communities.
              </p>
            </div>
            {[
              { title: "PLATFORM", items: ["Provider Portal", "Patient Portal", "Clinical Catalogs", "AI Engine"] },
              { title: "COMPANY", items: ["About", "Pilot Program", "Careers", "Contact"] },
              { title: "COMPLIANCE", items: ["HIPAA", "Security", "Privacy Policy", "Terms"] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", marginBottom: 14 }}>{col.title}</div>
                {col.items.map((item, j) => (
                  <div key={j} style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 10, cursor: "pointer" }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>\u00a9 2026 ATTENDING AI. All rights reserved.</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EKG w={100} h={16} color={C.coral} cycles={1} sw={1.5} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>attendingai.health</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
