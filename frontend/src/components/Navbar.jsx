import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart2, Book, Zap, LogOut, Bot, Users, Moon, Sun, Sparkles, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Nav links config ─────────────────────────────────────────────────── */
const NAV_LINKS = [
  { path: '/dashboard',      name: 'Thống kê',    icon: BarChart2, mobileLabel: 'Thống kê' },
  { path: '/vocabulary',     name: 'Từ vựng',     icon: Book,      mobileLabel: 'Từ vựng'  },
  { path: '/quiz',           name: 'Trắc nghiệm', icon: Zap,       mobileLabel: 'Quiz'     },
  { path: '/chat',           name: 'Chat AI',     icon: Bot,       mobileLabel: 'Chat AI'  },
  { path: '/community-chat', name: 'Cộng đồng',   icon: Users,     mobileLabel: 'Cộng đồng'},
];

/* ── Animated Dark Mode Toggle ────────────────────────────────────────── */
const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
      className="relative flex items-center cursor-pointer"
    >
      <motion.div
        className="relative w-[52px] h-[28px] rounded-full border-2 transition-colors duration-300 flex items-center px-0.5"
        style={{
          background: isDark ? '#1e293b' : '#e0f2fe',
          borderColor: isDark ? '#334155' : '#bae6fd',
        }}
        layout
      >
        {/* Sun icon (left) */}
        <motion.span
          className="absolute left-1.5 text-[11px] select-none pointer-events-none"
          animate={{ opacity: isDark ? 0.3 : 1 }}
          transition={{ duration: 0.2 }}
        >
          ☀️
        </motion.span>

        {/* Moon icon (right) */}
        <motion.span
          className="absolute right-1.5 text-[11px] select-none pointer-events-none"
          animate={{ opacity: isDark ? 1 : 0.3 }}
          transition={{ duration: 0.2 }}
        >
          🌙
        </motion.span>

        {/* Sliding knob */}
        <motion.div
          className="relative z-10 w-[20px] h-[20px] rounded-full shadow-md flex items-center justify-center"
          animate={{ x: isDark ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #38bdf8, #818cf8)'
              : 'linear-gradient(135deg, #fbbf24, #f97316)',
            boxShadow: isDark
              ? '0 0 8px 2px rgba(56,189,248,0.4)'
              : '0 0 8px 2px rgba(251,191,36,0.4)',
          }}
        >
          <motion.div
            animate={{ rotate: isDark ? 0 : 180 }}
            transition={{ duration: 0.4 }}
            className="text-white"
          >
            {isDark
              ? <Moon className="w-3 h-3" />
              : <Sun className="w-3 h-3" />
            }
          </motion.div>
        </motion.div>
      </motion.div>
    </button>
  );
};

/* ── Mobile Bottom Navigation ─────────────────────────────────────────── */
const BottomNav = ({ location }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-surface)] border-t-2 border-[var(--color-surface-border)] pb-safe"
      style={{ boxShadow: '0 -4px 24px 0 rgba(0,0,0,0.10)' }}
    >
      <div className="flex items-stretch h-[60px]">
        {NAV_LINKS.map(({ path, mobileLabel, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200"
            >
              {/* Active glow background */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 inset-y-1.5 rounded-xl"
                  style={{ background: 'var(--color-primary)', opacity: 0.12 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Active top pill */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full"
                  style={{ background: 'var(--color-primary)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <Icon
                className="w-5 h-5 transition-all duration-200"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  strokeWidth: isActive ? 2.5 : 1.8,
                }}
              />
              <span
                className="text-[10px] font-bold transition-all duration-200 leading-none"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                {mobileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/* ── Main Navbar ──────────────────────────────────────────────────────── */
const Navbar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* ── Desktop / Top Bar ── */}
      <div className="sticky top-0 z-50 w-full bg-[var(--color-surface)] border-b-2 border-[var(--color-surface-border)] px-4 py-2">
        <nav className="mx-auto max-w-7xl px-2 py-1 flex justify-between items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-[var(--color-primary)] group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
              CyberLingo
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex gap-1 items-center">
            {NAV_LINKS.map(({ path, name, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={name}
                  to={path}
                  className={`relative px-4 py-2.5 flex items-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'text-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--color-primary)] rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex gap-2 items-center shrink-0">
            {/* Dark mode toggle */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="w-px h-6 bg-[var(--color-surface-border)] mx-1" />

            {user ? (
              <div className="flex items-center gap-2">
                {/* Avatar + username */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-bg)] transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-sm overflow-hidden border border-[var(--color-surface-border)]">
                    {user.avatar && user.avatar !== 'default_cyber_avatar.png' ? (
                      <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      <span className="text-white font-extrabold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold hidden lg:block group-hover:text-[var(--color-primary)] transition-colors">
                    {user.username}
                  </span>
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/auth">
                <button className="btn-3d-primary py-2 px-4 text-xs rounded-xl">Đăng nhập</button>
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <BottomNav location={location} />
    </>
  );
};

export default Navbar;
