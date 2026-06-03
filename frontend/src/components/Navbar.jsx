import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Book, User, Zap, LogOut, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { path: '/dashboard', name: 'Thống kê', icon: <User className="w-5 h-5" /> },
    { path: '/vocabulary', name: 'Từ vựng', icon: <Book className="w-5 h-5" /> },
    { path: '/quiz', name: 'Trắc nghiệm', icon: <Zap className="w-5 h-5" /> },
    { path: '/chat', name: 'Chat AI', icon: <Bot className="w-5 h-5" /> },
  ];

  return (
    <nav className="glass-panel sticky top-4 z-50 mx-4 mt-4 px-6 py-4 flex justify-between items-center rounded-xl">
      <Link to="/" className="flex items-center gap-2 group">
        <Terminal className="w-8 h-8 text-[var(--color-primary)] group-hover:text-white transition-colors" />
        <span className="text-xl font-bold font-mono tracking-wider text-glow uppercase">CyberLingo</span>
      </Link>

      <div className="hidden md:flex gap-8 items-center">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-2 uppercase tracking-widest font-mono text-sm transition-all duration-300 ${
                isActive ? 'text-[var(--color-primary)] text-glow' : 'text-gray-400 hover:text-[var(--color-accent)]'
              }`}
            >
              {link.icon}
              {link.name}
              {isActive && (
                <motion.div 
                  layoutId="navbar-indicator"
                  className="absolute -bottom-4 left-0 right-0 h-1 bg-[var(--color-primary)]"
                  style={{ boxShadow: '0 -2px 10px rgba(0,240,255,0.5)' }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-4 items-center">
        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/profile" className="font-mono text-sm text-[var(--color-accent)] hover:text-white transition-colors cursor-pointer group flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/40 transition-colors">
                <User className="w-4 h-4 text-[var(--color-accent)] group-hover:text-white" />
              </div>
              [{user.username}]
            </Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-[var(--color-secondary)] transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link to="/auth">
            <button className="btn-primary">Đăng nhập</button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
