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
      <div className="flex justify-between items-center text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
        <span>Tích lũy: {xp} XP</span>
        <span>Cần {xpForNextLevel - (xp % 1000)} XP để lên cấp {level + 1}</span>
      </div>
      <div className="w-full h-5 bg-[var(--color-surface-border)] rounded-full overflow-hidden border-2 border-[var(--color-surface-border)] shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-400 to-[var(--color-primary)] rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          {/* Shiny effect on the progress bar */}
          <div className="absolute inset-0 bg-white/20 skew-x-12 animate-pulse" />
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
    className="card-3d p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4 cursor-default bg-[var(--color-surface)] hover:-translate-y-1 transition-transform min-w-0"
  >
    <div
      className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl shrink-0 shadow-md text-white font-bold flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider truncate whitespace-nowrap">{label}</p>
      <p className="text-base sm:text-2xl font-black text-[var(--color-text)] mt-0.5 whitespace-nowrap">{value}</p>
    </div>
  </motion.div>
);

// ─── Leaderboard Row ───────────────────────────────────────────────────────────
const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const LeaderboardRow = ({ user: u, rank, currentId }) => {
  const isMe = u.id === currentId;
  const isTop3 = rank <= 3;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-3 md:gap-4 px-3.5 py-3 md:px-5 md:py-3.5 rounded-2xl border-2 transition-all duration-200 ${isMe
          ? 'border-[var(--color-primary)] bg-sky-50/50 dark:bg-sky-950/20 shadow-sm'
          : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] hover:border-gray-300 dark:hover:border-slate-600'
        }`}
    >
      <div className="w-6 sm:w-8 flex justify-center shrink-0">
        {isTop3 ? (
          <span className="text-xl sm:text-2xl select-none">{RANK_MEDALS[rank - 1]}</span>
        ) : (
          <span className="font-extrabold text-[var(--color-text-muted)] text-sm sm:text-base">#{rank}</span>
        )}
      </div>

      {/* User avatar */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-100 to-sky-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-sky-800 dark:text-sky-200 text-sm sm:text-base shadow-sm overflow-hidden shrink-0">
        {u.avatar && u.avatar !== 'default_cyber_avatar.png' ? (
          <img src={u.avatar} className="w-full h-full object-cover" alt="avatar" />
        ) : (
          (u.username || 'U')[0].toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-black text-xs sm:text-sm truncate flex items-center gap-1.5 ${isMe ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
          <span className="truncate">{u.username}</span>
          {isMe && <span className="text-[8px] uppercase px-1 py-0.5 rounded bg-[var(--color-primary)] text-white font-black tracking-wider shrink-0">Bạn</span>}
        </p>
        <p className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
          <span className="whitespace-nowrap">Cấp {u.level}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-surface-border)] shrink-0 hidden sm:inline" />
          <span className="flex items-center text-orange-500 font-bold shrink-0">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 fill-current" />
            <span className="whitespace-nowrap">{u.streak} ngày</span>
          </span>
        </p>
      </div>

      <span className="font-black text-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm border-2 border-transparent border-b-[var(--color-surface-border)] shrink-0">
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
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card-3d p-5 flex flex-col items-center gap-3 cursor-pointer group hover:border-[var(--color-primary)]"
    >
      <div
        className="p-3.5 rounded-2xl transition-transform duration-200 group-hover:scale-110 shadow-md text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <span className="text-xs font-black text-[var(--color-text)] text-center uppercase tracking-wider">{label}</span>
    </motion.div>
  );
  return to ? <Link to={to} className="w-full">{content}</Link> : <div className="w-full">{content}</div>;
};

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`skeleton ${className}`} />
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
        const [s] = await Promise.all([getMyStats(), updateStreak().catch(() => { })]);
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

  useEffect(() => {
    if (!stats) return;
    const currentXp = stats.xp ?? 0;
    try {
      const lastTotalXp = parseInt(localStorage.getItem('cyberlingo_last_total_xp') || '-1');
      if (lastTotalXp !== -1) {
        if (currentXp > lastTotalXp) {
          const gained = currentXp - lastTotalXp;
          const todayStr = new Date().toISOString().split('T')[0];
          const dailyXpMap = JSON.parse(localStorage.getItem('cyberlingo_daily_xp') || '{}');
          dailyXpMap[todayStr] = (dailyXpMap[todayStr] || 0) + gained;
          localStorage.setItem('cyberlingo_daily_xp', JSON.stringify(dailyXpMap));
        }
      }
      localStorage.setItem('cyberlingo_last_total_xp', currentXp.toString());
    } catch { /* silent */ }
  }, [stats]);

  const getWeeklyXP = () => {
    try {
      const dailyXP = JSON.parse(localStorage.getItem('cyberlingo_daily_xp') || '{}');
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
      const weeklyData = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(curr);
        d.setDate(first + i);
        const dateStr = d.toISOString().split('T')[0];
        weeklyData.push(dailyXP[dateStr] || 0);
      }
      return weeklyData;
    } catch {
      return [0, 0, 0, 0, 0, 0, 0];
    }
  };

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const data = await generateAIWords('Modern Tech');
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
        className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4 bg-[var(--color-bg)]"
      >
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950/20 rounded-full flex items-center justify-center mb-6 border-2 border-orange-200">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-3xl font-black mb-3 text-[var(--color-text)]">Truy cập bị giới hạn</h2>
        <p className="text-[var(--color-text-muted)] text-base mb-8 max-w-sm font-medium">Vui lòng đăng nhập để lưu trữ tiến độ, thi đua bảng xếp hạng và học tập từ vựng.</p>
        <Link to="/auth">
          <button className="btn-3d-primary text-lg px-8 py-3 rounded-2xl">Đăng nhập ngay</button>
        </Link>
      </motion.div>
    );
  }

  const level = stats?.level || authUser?.level || 1;
  const xp = stats?.xp ?? authUser?.xp ?? 0;
  const xpForNextLevel = level * 1000;

  const statCards = [
    {
      label: 'Chuỗi Ngày', value: `${stats?.streak ?? authUser?.streak ?? 0} ngày`,
      icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />, color: '#ff9600'
    },
    {
      label: 'Từ Đã Học', value: stats ? `${stats.wordsLearned}/${stats.totalVocab}` : '—',
      icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />, color: '#1cb0f6'
    },
    {
      label: 'Bài Kiểm Tra', value: stats?.stats?.totalQuizzesTaken ?? 0,
      icon: <Brain className="w-5 h-5 sm:w-6 sm:h-6" />, color: '#b862f9'
    },
    {
      label: 'Điểm Cao Nhất', value: stats?.stats?.highestScore ?? 0,
      icon: <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />, color: '#ffc800'
    },
  ];

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-6xl mx-auto space-y-8 pb-16 px-4 bg-[var(--color-bg)] pt-4"
    >
      {/* ── Header / Profile Hero ─────────────────────────────────────────── */}
      <section className="card-3d p-6 md:p-8 relative overflow-hidden bg-[var(--color-surface)]">
        {/* Soft background circles */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-sky-200/20 dark:bg-sky-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-green-200/20 dark:bg-green-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
          {/* Avatar container */}
          <div className="relative shrink-0 select-none">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-sky-300 flex items-center justify-center p-1 shadow-lg border-2 border-[var(--color-surface-border)] overflow-hidden">
              <div className="w-full h-full bg-[var(--color-surface)] rounded-2xl flex items-center justify-center overflow-hidden">
                {authUser.avatar && authUser.avatar !== 'default_cyber_avatar.png' ? (
                  <img src={authUser.avatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <span className="text-4xl font-black text-[var(--color-primary)]">
                    {(authUser.username || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md border-2 border-[var(--color-surface)] uppercase tracking-wider">
              LV.{level}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1.5 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text)]">
                Xin chào, {authUser.username}!
              </h1>
              <span className="text-[10px] font-black bg-sky-100 dark:bg-sky-950 text-[var(--color-primary)] px-2.5 py-0.5 rounded-full w-max mx-auto md:mx-0 uppercase tracking-widest border border-sky-200 dark:border-sky-800">
                Học Viên
              </span>
            </div>
            <p className="text-[var(--color-text-muted)] text-sm font-bold mb-4">
              Mỗi ngày là một bước tiến mới. Hãy tiếp tục hành trình học tiếng Anh hôm nay nhé!
            </p>
            {loadingStats
              ? <Skeleton className="h-10 w-full max-w-md" />
              : <div className="max-w-md"><XPBar xp={xp} xpForNextLevel={xpForNextLevel} level={level} /></div>
            }
          </div>

          {/* Level Progress Circle */}
          <div className="shrink-0 hidden lg:block select-none">
            <div className="relative w-28 h-28 flex items-center justify-center bg-[var(--color-surface)] rounded-2xl border-2 border-[var(--color-surface-border)] shadow-sm">
              <svg className="w-full h-full -rotate-90 p-2" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--color-surface-border)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="transparent"
                  stroke="var(--color-primary)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 - (264 * Math.min(100, (xp % 1000) / 10) / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                />
              </svg>
              <div className="absolute text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest">Cấp Độ</span>
                <span className="text-3xl font-black text-[var(--color-text)] leading-none mt-0.5">{level}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : statCards.map((s, i) => <StatCard key={i} {...s} delay={i * 0.08} />)
        }
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section className="pt-2">
        <h2 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2 text-[var(--color-text)]">
          <Zap className="w-5 h-5 text-yellow-500 fill-current" /> Lối Tắt Học Tập
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction icon={<BookOpen className="w-6 h-6" />} label="Học Từ Vựng" to="/vocabulary" color="#1cb0f6" delay={0.1} />
          <QuickAction icon={<Brain className="w-6 h-6" />} label="Làm Bài Quiz" to="/quiz" color="#b862f9" delay={0.15} />
          <QuickAction
            icon={aiLoading ? <Cpu className="w-6 h-6 animate-spin" /> : <Cpu className="w-6 h-6" />}
            label={aiLoading ? 'Đang tạo...' : 'Tạo Dữ Liệu AI'}
            color="#58cc02"
            onClick={handleAI}
            delay={0.2}
          />
          <QuickAction icon={<Users className="w-6 h-6" />} label="BX Hạng" color="#ff9600" onClick={() => document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth' })} delay={0.25} />
        </div>
      </section>

      {/* ── Progress + Daily Missions ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* Progress chart */}
        <div className="lg:col-span-2 card-3d p-6 bg-[var(--color-surface)]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-[var(--color-text)]">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" /> Thống Kê Tuần
            </h2>
            <span className="text-xs font-bold px-3 py-1.5 bg-[var(--color-bg)] rounded-xl text-[var(--color-text-muted)] border border-[var(--color-surface-border)]">Hoạt Động</span>
          </div>
          {loadingStats ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              {(() => {
                const weeklyXPData = getWeeklyXP();
                const maxWeeklyXP = Math.max(...weeklyXPData, 50);
                return (
                  <>
                    <div className="h-52 flex items-end justify-between gap-3 md:gap-6 border-b-2 border-[var(--color-surface-border)] relative pb-2 pt-6">
                      {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((day, i) => {
                        const xpEarned = weeklyXPData[i];
                        const h = Math.max(8, Math.min(95, (xpEarned / maxWeeklyXP) * 95));
                        const currentDayIdx = new Date().getDay() - 1;
                        const isToday = i === (currentDayIdx < 0 ? 6 : currentDayIdx);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group cursor-pointer relative">
                            <div className="absolute -top-8 bg-[var(--color-text)] text-[var(--color-bg)] text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {xpEarned} XP
                            </div>
                            <motion.div
                              className={`w-full rounded-t-lg ${isToday ? 'bg-[var(--color-primary)] shadow-sm' : 'bg-sky-200 dark:bg-slate-700 group-hover:bg-sky-300 dark:group-hover:bg-slate-600'} transition-colors`}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
                              style={{ minHeight: '8px' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-1">
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => {
                        const currentDayIdx = new Date().getDay() - 1;
                        const isToday = i === (currentDayIdx < 0 ? 6 : currentDayIdx);
                        return (
                          <span key={i} className={`flex-1 text-center py-1 rounded-lg ${isToday ? 'text-[var(--color-primary)] font-black bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900' : ''}`}>{d}</span>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* Daily Missions */}
        <div className="card-3d p-6 bg-[var(--color-surface)]">
          <h2 className="text-lg font-black uppercase tracking-wider mb-5 flex items-center gap-2 text-[var(--color-text)]">
            <Target className="w-5 h-5 text-orange-500" /> Nhiệm vụ ngày
          </h2>
          {loadingStats ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3.5">
              {[
                {
                  title: 'Vượt ải trắc nghiệm', icon: <Brain className="w-4 h-4 fill-current" />,
                  progress: Math.min(100, (stats?.stats?.totalQuizzesTaken || 0) >= 1 ? 100 : 0),
                  color: '#b862f9'
                },
                {
                  title: 'Nạp thêm từ vựng', icon: <BookOpen className="w-4 h-4" />,
                  progress: Math.min(100, Math.round(((stats?.wordsLearned || 0) / Math.max(1, stats?.totalVocab || 10)) * 100)),
                  color: '#1cb0f6'
                },
                {
                  title: `Giữ lửa streak ngày`, icon: <Flame className="w-4 h-4 fill-current" />,
                  progress: Math.min(100, (stats?.streak || 0) > 0 ? 100 : 0),
                  color: '#ff9600'
                },
              ].map((m, idx) => (
                <div key={idx} className="bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] p-3.5 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl text-white shadow-sm" style={{ backgroundColor: m.color }}>{m.icon}</div>
                      <span className="text-xs font-bold text-[var(--color-text)]">{m.title}</span>
                    </div>
                    <span className="text-[10px] font-black tracking-wider" style={{ color: m.progress === 100 ? '#58cc02' : 'var(--color-text-muted)' }}>
                      {m.progress === 100 ? 'ĐẠT' : `${m.progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-border)] h-2 rounded-full overflow-hidden border border-transparent">
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
      <section id="leaderboard-section" className="card-3d p-6 bg-[var(--color-surface)] mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-[var(--color-text)]">
            <Trophy className="w-5 h-5 text-yellow-500 fill-current" /> Đấu trường học viên
          </h2>
          <span className="px-3.5 py-1.5 bg-[var(--color-bg)] text-[var(--color-text-muted)] rounded-xl text-xs font-bold border border-[var(--color-surface-border)] uppercase tracking-wider">Top 10 xếp hạng</span>
        </div>

        {loadingLb ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-[var(--color-bg)] rounded-2xl p-10 text-center border-2 border-dashed border-[var(--color-surface-border)]">
            <p className="text-[var(--color-text-muted)] font-bold">Chưa có bảng đấu nào diễn ra.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((u, i) => (
              <LeaderboardRow key={u.id} user={u} rank={i + 1} currentId={authUser?.id} />
            ))}
          </div>
        )}
      </section>

      {/* ── Achievements preview ───────────────────────────────────────────── */}
      <section className="card-3d p-6 bg-[var(--color-surface)] mt-2">
        <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 mb-6 text-[var(--color-text)]">
          <Award className="w-5 h-5 text-[var(--color-primary)]" /> Phòng trưng bày thành tựu
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'Khởi Động', icon: '🚀', desc: 'Gia nhập lớp học', earned: true },
            { name: 'Chiến Binh Quiz', icon: '⚔️', desc: 'Vượt qua 1 bài kiểm tra', earned: (stats?.stats?.totalQuizzesTaken || 0) >= 1 },
            { name: 'Từ Điển Sống', icon: '📚', desc: 'Học 10 từ vựng', earned: (stats?.wordsLearned || 0) >= 10 },
            { name: 'Chăm Chỉ', icon: '🔥', desc: 'Chuỗi học 3 ngày', earned: (stats?.streak || 0) >= 3 },
            { name: 'AI Partner', icon: '🤖', desc: 'Gọi AI nạp từ vựng', earned: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 relative select-none ${a.earned
                  ? 'border-yellow-400 bg-yellow-50/10 dark:bg-yellow-950/10 shadow-sm'
                  : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] opacity-55 grayscale'
                }`}
            >
              <div className="text-4xl mb-3 filter drop-shadow-md transition-transform duration-300 hover:scale-110">{a.icon}</div>
              <p className="text-xs font-black text-[var(--color-text)] leading-tight uppercase tracking-wide">{a.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 mb-2">{a.desc}</p>
              {a.earned && (
                <span className="text-[8px] font-black text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full mt-auto border border-yellow-200 dark:border-yellow-800 uppercase tracking-widest">
                  Đã Đạt
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
