import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Award, Flame, Target, Lock, Zap, Brain, Trophy,
  BookOpen, Shield, ChevronRight, Star, TrendingUp, Users, Cpu
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';
import { getMyStats, getLeaderboard, updateStreak } from '../services/statsService';
import { generateAIWords } from '../services/seedService';
import toast from 'react-hot-toast';

// ─── XP bar progress ───────────────────────────────────────────────────────────
const XPBar = ({ xp, xpForNextLevel, level }) => {
  const pct = Math.min(100, Math.round((xp % 1000) / 10));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
        <span>XP: {xp}</span>
        <span>Cần: {xpForNextLevel} để lên Lvl {level + 1}</span>
      </div>
      <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-[var(--color-dark-surface-border)]">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-black">{pct}%</span>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-panel p-5 flex items-center gap-4 relative overflow-hidden group cursor-default"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className={`p-3 rounded-lg border border-[var(--color-dark-surface-border)] bg-black/50 shrink-0`}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="relative z-10 min-w-0">
      <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest truncate">{label}</p>
      <p className="text-2xl font-black font-mono text-white">{value}</p>
    </div>
    <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-2xl opacity-10`} style={{ background: color }} />
  </motion.div>
);

// ─── Leaderboard Row ───────────────────────────────────────────────────────────
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const LeaderboardRow = ({ user: u, rank, currentId }) => {
  const isMe = u.id === currentId;
  const medal = rank <= 3 ? RANK_COLORS[rank - 1] : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${
        isMe
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
          : 'border-[var(--color-dark-surface-border)] bg-black/20 hover:bg-black/40'
      }`}
    >
      <span className="w-7 text-center font-black font-mono text-sm" style={{ color: medal || '#6b7280' }}>
        {medal ? <Trophy className="w-4 h-4 inline" style={{ color: medal }} /> : `#${rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-mono font-bold text-sm truncate ${isMe ? 'text-[var(--color-primary)]' : 'text-white'}`}>
          {u.username} {isMe && <span className="text-[10px] opacity-70">(Bạn)</span>}
        </p>
        <p className="text-[10px] text-gray-500 font-mono">Lv.{u.level} · Streak: {u.streak}🔥</p>
      </div>
      <span className="font-black font-mono text-sm text-[var(--color-accent)]">{u.xp} XP</span>
    </motion.div>
  );
};

// ─── Quick Action Button ────────────────────────────────────────────────────────
const QuickAction = ({ icon, label, to, color, onClick, delay = 0 }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="glass-panel p-5 flex flex-col items-center gap-3 cursor-pointer group relative overflow-hidden border border-transparent hover:border-[var(--color-primary)] transition-all duration-300"
    >
      <div className={`p-4 rounded-full border-2 transition-all duration-300 group-hover:scale-110`}
        style={{ borderColor: color, background: color + '22' }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-300 group-hover:text-white transition-colors text-center">{label}</span>
      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLb, setLoadingLb] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!authUser) return;

    const fetchAll = async () => {
      try {
        setLoadingStats(true);
        const [s] = await Promise.all([getMyStats(), updateStreak().catch(() => {})]);
        setStats(s);
      } catch (e) {
        toast.error('Không thể tải thống kê cá nhân');
      } finally {
        setLoadingStats(false);
      }

      try {
        setLoadingLb(true);
        const lb = await getLeaderboard();
        setLeaderboard(lb);
      } catch (e) {
        // silent
      } finally {
        setLoadingLb(false);
      }
    };

    fetchAll();
  }, [authUser]);

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const data = await generateAIWords('Cyberpunk');
      toast.success(data.message || 'AI đã tạo dữ liệu mới!');
      // refresh stats after AI gen
      const s = await getMyStats();
      setStats(s);
    } catch (e) {
      toast.error('Lỗi khi gọi AI sinh dữ liệu');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authUser) {
    return (
      <motion.div
        variants={pageVariants} initial="initial" animate="animate" exit="exit"
        className="min-h-[60vh] flex flex-col items-center justify-center text-center"
      >
        <Lock className="w-16 h-16 text-[var(--color-secondary)] mb-4 animate-pulse" />
        <h2 className="text-2xl font-mono font-bold uppercase mb-4 text-[var(--color-secondary)]">Truy cập bị từ chối</h2>
        <p className="text-gray-400 font-mono mb-8">Vui lòng đăng nhập để truy cập trung tâm chỉ huy của bạn.</p>
        <Link to="/auth">
          <button className="btn-primary">Kết Nối Ngay</button>
        </Link>
      </motion.div>
    );
  }

  const level = stats?.level || authUser?.level || 1;
  const xp = stats?.xp ?? authUser?.xp ?? 0;
  const xpForNextLevel = level * 1000;

  const statCards = [
    {
      label: 'Chuỗi Ngày', value: `${stats?.streak ?? authUser?.streak ?? 0} 🔥`,
      icon: <Flame className="w-6 h-6" />, color: '#f97316'
    },
    {
      label: 'Từ Đã Học', value: stats ? `${stats.wordsLearned}/${stats.totalVocab}` : '—',
      icon: <BookOpen className="w-6 h-6" />, color: 'var(--color-primary)'
    },
    {
      label: 'Bài Quiz', value: stats?.stats?.totalQuizzesTaken ?? 0,
      icon: <Brain className="w-6 h-6" />, color: 'var(--color-secondary)'
    },
    {
      label: 'Điểm Cao Nhất', value: stats?.stats?.highestScore ?? 0,
      icon: <Star className="w-6 h-6" />, color: 'var(--color-accent)'
    },
  ];

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      {/* ── Header / Profile Hero ─────────────────────────────────────────── */}
      <section className="glass-panel p-8 relative overflow-hidden">
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center border-2 border-[var(--color-primary)] shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <span className="text-3xl font-black text-black font-mono">
                {(authUser.username || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[var(--color-accent)] text-black text-[10px] font-black px-1.5 py-0.5 rounded-full font-mono">
              LV.{level}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-black font-mono text-glow text-[var(--color-primary)] uppercase tracking-widest">
                {authUser.username}
              </h1>
              <span className="text-xs bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] px-2 py-0.5 rounded font-mono uppercase">
                Đặc Vụ
              </span>
            </div>
            <p className="text-gray-400 font-mono text-sm mb-4">
              Trung tâm chỉ huy học ngôn ngữ của bạn. Dữ liệu thần kinh đang được đồng bộ hóa.
            </p>
            {loadingStats
              ? <Skeleton className="h-5 w-full" />
              : <XPBar xp={xp} xpForNextLevel={xpForNextLevel} level={level} />
            }
          </div>

          {/* Level badge */}
          <div className="shrink-0 text-center hidden md:block">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#1a1a1a" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="transparent"
                  stroke="var(--color-accent)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 - (264 * Math.min(100, (xp % 1000) / 10) / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-[10px] text-gray-500 font-mono uppercase">Level</p>
                <p className="text-3xl font-black text-white font-mono">{level}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : statCards.map((s, i) => <StatCard key={i} {...s} delay={i * 0.08} />)
        }
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--color-accent)]" /> Hành Động Nhanh
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction icon={<BookOpen className="w-7 h-7" />} label="Học Từ Vựng" to="/vocabulary" color="#00f0ff" delay={0.1} />
          <QuickAction icon={<Brain className="w-7 h-7" />} label="Bài Kiểm Tra" to="/quiz" color="#ff2d6a" delay={0.15} />
          <QuickAction
            icon={aiLoading ? <Cpu className="w-7 h-7 animate-spin" /> : <Cpu className="w-7 h-7" />}
            label={aiLoading ? 'Đang tạo...' : 'AI Sinh Từ Mới'}
            color="#a855f7"
            onClick={handleAI}
            delay={0.2}
          />
          <QuickAction icon={<Users className="w-7 h-7" />} label="Bảng Xếp Hạng" color="#f59e0b" onClick={() => document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth' })} delay={0.25} />
        </div>
      </section>

      {/* ── Progress + Daily Missions ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Progress chart */}
        <div className="lg:col-span-2 glass-panel p-6">
          <h2 className="text-base font-bold font-mono uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse" />
            Tiến Độ XP Theo Tuần
          </h2>
          {loadingStats ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="h-48 flex items-end justify-between gap-2 border-b border-l border-[var(--color-dark-surface-border)] relative px-2">
                {/* Y-axis label */}
                <span className="absolute -left-6 top-0 text-[9px] text-gray-600 font-mono">XP</span>

                {/* Simulated bars using real level/xp as seed for visual variety */}
                {['T2','T3','T4','T5','T6','T7','CN'].map((day, i) => {
                  const base = (xp % 100) || 30;
                  const heights = [
                    Math.min(95, base * 0.6),
                    Math.min(95, base * 1.1),
                    Math.min(95, base * 0.75),
                    Math.min(95, base * 1.3),
                    Math.min(95, base * 0.9),
                    Math.min(95, base * 1.2),
                    Math.min(95, base * 1.5),
                  ];
                  const h = Math.round(heights[i]);
                  const isToday = i === new Date().getDay() - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[9px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{h}%</span>
                      <motion.div
                        className="w-full rounded-t-sm relative"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
                        style={{
                          background: isToday
                            ? 'linear-gradient(to top, var(--color-accent), var(--color-primary))'
                            : 'linear-gradient(to top, rgba(0,240,255,0.1), rgba(0,240,255,0.4))',
                          minHeight: '4px'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono px-2">
                {['T2','T3','T4','T5','T6','T7','CN'].map((d, i) => (
                  <span key={i} className={i === new Date().getDay() - 1 ? 'text-[var(--color-primary)]' : ''}>{d}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Missions */}
        <div className="glass-panel p-6">
          <h2 className="text-base font-bold font-mono uppercase tracking-wider mb-5 flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-secondary)]" /> Nhiệm Vụ Hôm Nay
          </h2>
          {loadingStats ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  title: 'Hoàn thành bài quiz', icon: <Brain className="w-4 h-4" />,
                  progress: Math.min(100, (stats?.stats?.totalQuizzesTaken || 0) >= 1 ? 100 : 0),
                  color: 'var(--color-secondary)'
                },
                {
                  title: 'Học từ vựng mới', icon: <BookOpen className="w-4 h-4" />,
                  progress: Math.min(100, Math.round(((stats?.wordsLearned || 0) / Math.max(1, stats?.totalVocab || 10)) * 100)),
                  color: 'var(--color-primary)'
                },
                {
                  title: `Duy trì streak ${stats?.streak || 0} ngày`, icon: <Flame className="w-4 h-4" />,
                  progress: Math.min(100, (stats?.streak || 0) > 0 ? 100 : 0),
                  color: '#f97316'
                },
              ].map((m, idx) => (
                <div key={idx} className="bg-black/30 p-3 rounded-lg border border-[var(--color-dark-surface-border)] group hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color: m.color }}>{m.icon}</span>
                      <span className="text-xs text-gray-300 font-mono">{m.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: m.progress === 100 ? m.color : '#6b7280' }}>
                      {m.progress === 100 ? '✓ DONE' : `${m.progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: m.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 0.9, delay: idx * 0.1 }}
                    />
                  </div>
                </div>
              ))}

              {/* XP info box */}
              <div className="mt-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/30 p-3 rounded-lg text-center">
                <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">Tổng XP Tích Lũy</p>
                <p className="text-2xl font-black text-[var(--color-primary)] font-mono">{xp} <span className="text-sm">XP</span></p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Còn {Math.max(0, xpForNextLevel - xp)} XP lên Lv.{level + 1}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────────── */}
      <section id="leaderboard-section" className="glass-panel p-6">
        <h2 className="text-base font-bold font-mono uppercase tracking-wider mb-5 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> Bảng Xếp Hạng Nơ-ron
          <span className="ml-auto text-[10px] text-gray-500 font-mono uppercase">Top 10 · Xếp theo XP</span>
        </h2>

        {loadingLb ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-gray-500 font-mono text-center py-8">Chưa có dữ liệu bảng xếp hạng.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((u, i) => (
              <LeaderboardRow key={u.id} user={u} rank={i + 1} currentId={authUser?.id} />
            ))}
          </div>
        )}
      </section>

      {/* ── Achievements preview ───────────────────────────────────────────── */}
      <section className="glass-panel p-6">
        <h2 className="text-base font-bold font-mono uppercase tracking-wider mb-5 flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--color-accent)]" /> Thành Tựu
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { name: 'Khởi Động', icon: '🚀', desc: 'Đăng ký tài khoản', earned: true },
            { name: 'Chiến Binh Quiz', icon: '⚔️', desc: 'Hoàn thành 1 bài quiz', earned: (stats?.stats?.totalQuizzesTaken || 0) >= 1 },
            { name: 'Từ Điển Sống', icon: '📚', desc: 'Học 10 từ vựng', earned: (stats?.wordsLearned || 0) >= 10 },
            { name: 'Liên Tục', icon: '🔥', desc: 'Streak 3 ngày', earned: (stats?.streak || 0) >= 3 },
            { name: 'AI Partner', icon: '🤖', desc: 'Dùng AI sinh dữ liệu', earned: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`p-4 rounded-xl border text-center transition-all duration-300 ${
                a.earned
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-[0_0_15px_rgba(0,255,136,0.1)]'
                  : 'border-[var(--color-dark-surface-border)] opacity-50 grayscale'
              }`}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <p className="text-xs font-bold font-mono text-white">{a.name}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">{a.desc}</p>
              {a.earned && <span className="text-[10px] text-[var(--color-accent)] font-mono">✓ Đạt được</span>}
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
