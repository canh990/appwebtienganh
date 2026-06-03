import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Book, User, Zap, LogOut, Bot, Users, Moon, Sun, Sparkles } from 'lucide-react';
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
    <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
      <nav className="glass-panel mx-auto max-w-7xl px-6 py-3.5 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
            CyberLingo
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex gap-2 items-center">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-border)]/50'
                }`}
              >
                {link.icon}
                {link.name}
                {isActive && (
                  <motion.div 
                    layoutId="navbar-indicator"
                    className="absolute inset-0 border border-[var(--color-primary)]/30 rounded-xl pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex gap-3 items-center">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-border)]/50 transition-all duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="w-px h-6 bg-[var(--color-surface-border)] mx-1" />

          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-border)]/50 transition-all duration-300 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium hidden lg:block group-hover:text-[var(--color-primary)] transition-colors">
                  {user.username}
                </span>
              </Link>
              <button 
                onClick={handleLogout} 
                className="p-2.5 rounded-xl text-gray-400 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all duration-300"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/auth">
              <button className="btn-primary py-2 px-5 text-sm rounded-xl">Đăng nhập</button>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
