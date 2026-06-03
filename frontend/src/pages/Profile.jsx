import { motion } from 'framer-motion';
import { Shield, Target, Flame, Cpu, Star, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return <div className="text-center mt-20 font-mono text-gray-400">Đang đồng bộ dữ liệu nơ-ron...</div>;

  const xpProgress = (user.xp % 1000) / 1000 * 100; // Giả sử 1000 XP / Level

  const badges = [
    { id: 1, name: 'First Blood', icon: <Target className="w-6 h-6 text-red-500" />, active: true },
    { id: 2, name: 'Cyber Learner', icon: <Cpu className="w-6 h-6 text-[var(--color-primary)]" />, active: true },
    { id: 3, name: '7-Day Streak', icon: <Flame className="w-6 h-6 text-orange-500" />, active: user.streak >= 7 },
    { id: 4, name: 'Vocab Master', icon: <Star className="w-6 h-6 text-yellow-500" />, active: false },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-4xl mx-auto py-10"
    >
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black font-mono uppercase tracking-widest text-glow mb-2">Hồ Sơ Đặc Vụ</h1>
      </header>

      {/* Profile Card */}
      <div className="glass-panel p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl"></div>
        
        {/* Avatar Ring */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-[var(--color-dark-surface-border)] relative z-10 overflow-hidden bg-black flex items-center justify-center">
            {/* Fallback avatar icon */}
            <Shield className="w-16 h-16 text-[var(--color-primary)] opacity-50" />
          </div>
          <div className="absolute -inset-2 rounded-full border border-[var(--color-primary)]/50 animate-spin-slow" style={{ borderStyle: 'dashed' }}></div>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold font-mono text-white mb-2">[{user.username}]</h2>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
            <span className="px-3 py-1 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 rounded text-[var(--color-primary)] font-mono text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" /> LEVEL {user.level || 1}
            </span>
            <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-orange-500 font-mono text-sm flex items-center gap-2">
              <Flame className="w-4 h-4" /> {user.streak || 0} STREAK
            </span>
          </div>

          {/* XP Bar */}
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs font-mono text-gray-400 mb-2">
              <span>XP: {user.xp || 0}</span>
              <span>Next Lvl: {(user.level || 1) * 1000}</span>
            </div>
            <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-[var(--color-dark-surface-border)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] relative"
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 skew-x-12 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <h3 className="text-2xl font-bold font-mono text-white mb-6 uppercase tracking-wider flex items-center gap-2">
        <Star className="text-[var(--color-accent)]" /> Huy Hiệu Thành Tựu
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {badges.map((badge) => (
          <div 
            key={badge.id}
            className={`glass-panel p-6 flex flex-col items-center justify-center text-center transition-all ${
              badge.active 
                ? 'border-[var(--color-primary)]/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
                : 'opacity-50 grayscale border-[var(--color-dark-surface-border)]'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              badge.active ? 'bg-white/10' : 'bg-black/50'
            }`}>
              {badge.icon}
            </div>
            <span className="font-mono text-sm font-bold">{badge.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Profile;
