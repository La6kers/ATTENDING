import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

// ============================================================
// Tab Navigation (matches ProviderShell)
// ============================================================

const NAV_ITEMS = [
  { id: 'dashboard',    to: '/',             label: 'Dashboard',   icon: HomeIcon },
  { id: 'waiting-room', to: '/waiting-room', label: 'Waiting Room', icon: ActivityIcon },
  { id: 'ems',          to: '/ems',          label: 'EMS',         icon: AmbulanceIcon },
  { id: 'er',           to: '/er',           label: 'ER Incoming', icon: ERIcon },
];

// ============================================================
// Layout — ProviderShell port
// ============================================================

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [time, setTime] = useState('');
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus search
  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  // Close user menu on outside click
  useEffect(() => {
    const handle = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Context badge from route
  const contextBadge = (() => {
    const p = location.pathname;
    if (p === '/') return 'Dashboard';
    const item = NAV_ITEMS.find(n => n.to !== '/' && p.startsWith(n.to));
    return item?.label || 'Provider Portal';
  })();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}>

      {/* ═══ HEADER — Frosted glass ═══ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(12, 53, 71, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-[60px]">
            {/* Left — Logo + badge */}
            <div className="flex items-center gap-3">
              <NavLink to="/" className="flex items-center gap-3 select-none">
                <span className="text-[22px] font-extrabold tracking-tight leading-none text-white">
                  ATTENDING
                </span>
                <span
                  className="px-3 py-0.5 text-[11px] font-semibold rounded-full"
                  style={{ background: 'rgba(26, 143, 168, 0.4)', color: '#7dd3c8' }}
                >
                  {contextBadge}
                </span>
              </NavLink>
            </div>

            {/* Center — clock */}
            <span className="hidden md:inline text-sm font-semibold text-teal-200">{time}</span>

            {/* Right — search, notifications, settings, user */}
            <div className="flex items-center gap-1.5">
              {showSearch ? (
                <form onSubmit={(e) => { e.preventDefault(); setShowSearch(false); }} className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients, orders..."
                    className="pl-9 pr-8 py-2 w-60 rounded-xl text-sm text-white placeholder-white/40 outline-none"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <button type="button" onClick={() => setShowSearch(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Search (Ctrl+K)"
                >
                  <SearchIcon className="w-[18px] h-[18px]" />
                </button>
              )}

              <button className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <BellIcon className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <SettingsIcon className="w-[18px] h-[18px]" />
              </button>

              {/* User Avatar */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(180deg, #25B8A9 0%, #1A8FA8 100%)' }}
                  >
                    SI
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b" style={{ background: '#E6F7F5' }}>
                      <p className="font-semibold text-sm" style={{ color: '#0C3547' }}>Dr. Scott Isbell</p>
                      <p className="text-xs" style={{ color: '#1A8FA8' }}>Family Medicine</p>
                    </div>
                    <div className="py-1">
                      <button className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 w-full">
                        <UserIcon className="w-4 h-4" /> My Profile
                      </button>
                      <button className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 w-full">
                        <SettingsIcon className="w-4 h-4" /> Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TAB NAVIGATION ═══ */}
        <div className="border-t border-white/10">
          <div className="px-4 lg:px-6">
            <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-white text-white'
                        : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}

              {/* COMPASS link */}
              <a
                href="/compass"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-white/50 hover:text-white/80 hover:border-white/30 transition-all whitespace-nowrap ml-auto"
              >
                <CompassIcon className="w-4 h-4" />
                COMPASS Intake
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded" style={{ background: 'linear-gradient(135deg, #1A8FA8, #25B8A9)', color: 'white' }}>AI</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ═══ PAGE CONTENT ═══ */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// ============================================================
// ICONS
// ============================================================

function HomeIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>);
}
function ActivityIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>);
}
function AmbulanceIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>);
}
function ERIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>);
}
function CompassIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" /></svg>);
}
function SearchIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>);
}
function BellIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>);
}
function SettingsIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>);
}
function CloseIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>);
}
function ChevronDownIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>);
}
function UserIcon({ className }) {
  return (<svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);
}
