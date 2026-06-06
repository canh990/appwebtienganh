import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Book, User, Zap, LogOut, Bot, Users, Moon, Sun, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { path: '/dashboard', name: 'Thống kê', icon: <User className="w-4 h-4" /> },
    { path: '/vocabulary', name: 'Từ vựng', icon: <Book className="w-4 h-4" /> },
    { path: '/quiz', name: 'Trắc nghiệm', icon: <Zap className="w-4 h-4" /> },
    { path: '/chat', name: 'Chat AI', icon: <Bot className="w-4 h-4" /> },
    { path: '/community-chat', name: 'Cộng đồng', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="sticky top-0 z-50 w-full bg-[var(--color-surface)] border-b-2 border-[var(--color-surface-border)] px-4 py-2">
      <nav className="mx-auto max-w-7xl px-2 py-1 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-[var(--color-primary)] group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
            CyberLingo
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex gap-1.5 items-center">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative px-4 py-2.5 flex items-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive 
                    ? 'text-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--color-primary)] rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex gap-2 items-center">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-all duration-200 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="w-px h-6 bg-[var(--color-surface-border)] mx-1" />

          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/vocabulary?add=true"
                className="btn-3d-primary py-2 px-3 text-xs rounded-xl flex items-center gap-1.5 font-black uppercase tracking-wider shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm từ vựng</span>
              </Link>

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
  );
};

export default Navbar;
