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
      <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)] mb-2">
        <span>XP: {xp}</span>
        <span>Cần: {xpForNextLevel} để lên Lvl {level + 1}</span>
      </div>
      <div className="w-full h-2.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
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
    className="glass-panel p-6 flex flex-col justify-between gap-4 group cursor-default"
  >
    <div className="flex justify-between items-start">
      <div 
        className="p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        {icon}
      </div>
      <div className="w-10 h-10 rounded-full blur-2xl opacity-20 absolute -right-4 -top-4 transition-opacity duration-300 group-hover:opacity-40" style={{ background: color }} />
    </div>
    <div>
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
      <p className="text-3xl font-bold text-[var(--color-text)] mt-1">{value}</p>
    </div>
  </motion.div>
);

// ─── Leaderboard Row ───────────────────────────────────────────────────────────
const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309'];
const LeaderboardRow = ({ user: u, rank, currentId }) => {
  const isMe = u.id === currentId;
  const medal = rank <= 3 ? RANK_COLORS[rank - 1] : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 ${
        isMe
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
          : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="w-8 flex justify-center shrink-0">
        {medal ? (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: `${medal}20`, color: medal }}>
            <Trophy className="w-4 h-4" />
          </div>
        ) : (
          <span className="font-bold text-[var(--color-text-muted)] text-lg">#{rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-base truncate flex items-center gap-2 ${isMe ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
          {u.username}
          {isMe && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white font-bold">Bạn</span>}
        </p>
        <p className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
          <span>Lv.{u.level}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-surface-border)]" />
          <span className="flex items-center text-[var(--color-warning)]">
            <Flame className="w-3 h-3 mr-0.5" /> {u.streak} chuỗi
          </span>
        </p>
      </div>
      <span className="font-extrabold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 rounded-lg text-sm">
        {u.xp} XP
      </span>
    </motion.div>
  );
};

// ─── Quick Action Button ────────────────────────────────────────────────────────
const QuickAction = ({ icon, label, to, color, onClick, delay = 0 }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -4, shadow: 'md' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-panel p-6 flex flex-col items-center gap-4 cursor-pointer group hover:border-[var(--color-primary)]/50"
    >
      <div className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm"
        style={{ backgroundColor: color, color: '#fff' }}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-[var(--color-text)] text-center">{label}</span>
    </motion.div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-[var(--color-surface-border)] rounded-xl animate-pulse ${className}`} />
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
      const data = await generateAIWords('Modern Tech'); // Changed from Cyberpunk
      toast.success(data.message || 'AI đã tạo dữ liệu mới!');
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
        <div className="w-20 h-20 bg-[var(--color-secondary)]/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-[var(--color-secondary)]" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-[var(--color-text)]">Truy cập bị từ chối</h2>
        <p className="text-[var(--color-text-muted)] text-lg mb-8 max-w-md">Vui lòng đăng nhập để theo dõi tiến độ và trải nghiệm các tính năng học tập.</p>
        <Link to="/auth">
          <button className="btn-primary text-lg px-8 py-3 rounded-2xl">Đăng Nhập Ngay</button>
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
      icon: <Flame className="w-7 h-7" />, color: 'var(--color-warning)'
    },
    {
      label: 'Từ Đã Học', value: stats ? `${stats.wordsLearned}/${stats.totalVocab}` : '—',
      icon: <BookOpen className="w-7 h-7" />, color: 'var(--color-primary)'
    },
    {
      label: 'Bài Quiz', value: stats?.stats?.totalQuizzesTaken ?? 0,
      icon: <Brain className="w-7 h-7" />, color: 'var(--color-secondary)'
    },
    {
      label: 'Điểm Cao Nhất', value: stats?.stats?.highestScore ?? 0,
      icon: <Star className="w-7 h-7" />, color: 'var(--color-accent)'
    },
  ];

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      {/* ── Header / Profile Hero ─────────────────────────────────────────── */}
      <section className="glass-panel p-8 md:p-10 relative overflow-hidden">
        {/* Soft background gradient */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center p-1 shadow-lg">
              <div className="w-full h-full bg-[var(--color-surface)] rounded-full flex items-center justify-center">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
                  {(authUser.username || 'U')[0].toUpperCase()}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-2 right-2 bg-[var(--color-text)] text-[var(--color-surface)] text-xs font-bold px-3 py-1 rounded-full shadow-md border-2 border-[var(--color-surface)]">
              LV.{level}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2 justify-center md:justify-start">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-text)]">
                Xin chào, {authUser.username}
              </h1>
              <span className="text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-3 py-1 rounded-full w-max mx-auto md:mx-0">
                Học Viên
              </span>
            </div>
            <p className="text-[var(--color-text-muted)] text-base font-medium mb-6">
              Sẵn sàng để tiếp tục hành trình học ngôn ngữ của bạn hôm nay?
            </p>
            {loadingStats
              ? <Skeleton className="h-6 w-full max-w-md" />
              : <div className="max-w-md"><XPBar xp={xp} xpForNextLevel={xpForNextLevel} level={level} /></div>
            }
          </div>

          {/* Level Progress Circle */}
          <div className="shrink-0 hidden lg:block">
            <div className="relative w-32 h-32 flex items-center justify-center bg-[var(--color-surface)] rounded-full shadow-sm border border-[var(--color-surface-border)]">
              <svg className="w-full h-full -rotate-90 p-2" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--color-surface-border)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="transparent"
                  stroke="var(--color-primary)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 - (264 * Math.min(100, (xp % 1000) / 10) / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                />
              </svg>
              <div className="absolute text-center flex flex-col items-center">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Cấp Độ</span>
                <span className="text-4xl font-black text-[var(--color-text)] leading-none mt-1">{level}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : statCards.map((s, i) => <StatCard key={i} {...s} delay={i * 0.08} />)
        }
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section className="pt-2">
        <h2 className="text-xl font-bold tracking-tight mb-5 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--color-accent)]" /> Hành Động Nhanh
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction icon={<BookOpen className="w-7 h-7" />} label="Học Từ Vựng" to="/vocabulary" color="var(--color-primary)" delay={0.1} />
          <QuickAction icon={<Brain className="w-7 h-7" />} label="Bài Kiểm Tra" to="/quiz" color="var(--color-secondary)" delay={0.15} />
          <QuickAction
            icon={aiLoading ? <Cpu className="w-7 h-7 animate-spin" /> : <Cpu className="w-7 h-7" />}
            label={aiLoading ? 'Đang tạo...' : 'Tạo Dữ Liệu AI'}
            color="var(--color-accent)"
            onClick={handleAI}
            delay={0.2}
          />
          <QuickAction icon={<Users className="w-7 h-7" />} label="Bảng Xếp Hạng" color="var(--color-warning)" onClick={() => document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth' })} delay={0.25} />
        </div>
      </section>

      {/* ── Progress + Daily Missions ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* Progress chart */}
        <div className="lg:col-span-2 glass-panel p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" /> Tiến Độ XP
            </h2>
            <span className="text-xs font-semibold px-3 py-1 bg-[var(--color-surface-border)] rounded-full text-[var(--color-text-muted)]">Tuần này</span>
          </div>
          {loadingStats ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              <div className="h-56 flex items-end justify-between gap-3 md:gap-6 border-b border-[var(--color-surface-border)] relative pb-2 pt-6">
                {/* Simulated bars */}
                {['T2','T3','T4','T5','T6','T7','CN'].map((day, i) => {
                  const base = (xp % 100) || 30;
                  const heights = [
                    Math.min(95, base * 0.6), Math.min(95, base * 1.1), Math.min(95, base * 0.75),
                    Math.min(95, base * 1.3), Math.min(95, base * 0.9), Math.min(95, base * 1.2), Math.min(95, base * 1.5),
                  ];
                  const h = Math.round(heights[i]);
                  const isToday = i === new Date().getDay() - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group cursor-pointer relative">
                      <div className="absolute -top-8 bg-[var(--color-text)] text-[var(--color-bg)] text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {h * 10} XP
                      </div>
                      <motion.div
                        className={`w-full rounded-md ${isToday ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary)]/40'} transition-colors`}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
                        style={{ minHeight: '8px' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 text-xs font-medium text-[var(--color-text-muted)] px-1">
                {['T2','T3','T4','T5','T6','T7','CN'].map((d, i) => (
                  <span key={i} className={`flex-1 text-center ${i === new Date().getDay() - 1 ? 'text-[var(--color-text)] font-bold bg-[var(--color-surface-border)] rounded-md py-0.5' : ''}`}>{d}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Missions */}
        <div className="glass-panel p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--color-secondary)]" /> Mục Tiêu Ngày
          </h2>
          {loadingStats ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                {
                  title: 'Hoàn thành bài kiểm tra', icon: <Brain className="w-5 h-5" />,
                  progress: Math.min(100, (stats?.stats?.totalQuizzesTaken || 0) >= 1 ? 100 : 0),
                  color: 'var(--color-secondary)'
                },
                {
                  title: 'Học từ vựng mới', icon: <BookOpen className="w-5 h-5" />,
                  progress: Math.min(100, Math.round(((stats?.wordsLearned || 0) / Math.max(1, stats?.totalVocab || 10)) * 100)),
                  color: 'var(--color-primary)'
                },
                {
                  title: `Chuỗi học ${stats?.streak || 0} ngày`, icon: <Flame className="w-5 h-5" />,
                  progress: Math.min(100, (stats?.streak || 0) > 0 ? 100 : 0),
                  color: 'var(--color-warning)'
                },
              ].map((m, idx) => (
                <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${m.color}15`, color: m.color }}>{m.icon}</div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{m.title}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: m.progress === 100 ? m.color : 'var(--color-text-muted)' }}>
                      {m.progress === 100 ? 'HOÀN THÀNH' : `${m.progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-border)] h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: m.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 0.9, delay: idx * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────────── */}
      <section id="leaderboard-section" className="glass-panel p-6 md:p-8 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Bảng Xếp Hạng
          </h2>
          <span className="px-3 py-1.5 bg-[var(--color-surface-border)] text-[var(--color-text-muted)] rounded-lg text-xs font-bold">Top 10 (XP Cao Nhất)</span>
        </div>

        {loadingLb ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-[var(--color-surface-border)]/30 rounded-2xl p-10 text-center">
            <p className="text-[var(--color-text-muted)] font-medium">Chưa có dữ liệu người dùng nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((u, i) => (
              <LeaderboardRow key={u.id} user={u} rank={i + 1} currentId={authUser?.id} />
            ))}
          </div>
        )}
      </section>

      {/* ── Achievements preview ───────────────────────────────────────────── */}
      <section className="glass-panel p-6 md:p-8 mt-2">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-[var(--color-accent)]" /> Thành Tựu
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'Khởi Động', icon: '🚀', desc: 'Đăng ký tài khoản', earned: true },
            { name: 'Chiến Binh Quiz', icon: '⚔️', desc: 'Làm 1 bài kiểm tra', earned: (stats?.stats?.totalQuizzesTaken || 0) >= 1 },
            { name: 'Từ Điển Sống', icon: '📚', desc: 'Học 10 từ vựng', earned: (stats?.wordsLearned || 0) >= 10 },
            { name: 'Chăm Chỉ', icon: '🔥', desc: 'Chuỗi 3 ngày', earned: (stats?.streak || 0) >= 3 },
            { name: 'AI Partner', icon: '🤖', desc: 'Dùng AI sinh dữ liệu', earned: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                a.earned
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-sm'
                  : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
              }`}
            >
              <div className="text-4xl mb-3 filter drop-shadow-sm">{a.icon}</div>
              <p className="text-sm font-bold text-[var(--color-text)] leading-tight">{a.name}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1 mb-2">{a.desc}</p>
              {a.earned && <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-wider bg-[var(--color-accent)]/20 px-2 py-0.5 rounded-full mt-auto">Hoàn Thành</span>}
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
