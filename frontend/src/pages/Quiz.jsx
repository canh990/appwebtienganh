import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, Volume2,
  Sparkles, Trophy, Brain, RotateCcw, ChevronRight, Clock,
  Headphones, PenLine, ListChecks, Zap, Heart, X, Play,
  Globe, ChevronLeft, BookOpen, Layers
} from 'lucide-react';
import { getRandomQuiz, submitQuiz, getQuizThemes } from '../services/quizService';
import { generateAIWords } from '../services/seedService';
import { getThemes } from '../services/vocabularyService';
import { useTimer } from '../hooks/useTimer';
import { pageVariants } from '../animations/variants';
import { useAuth } from '../context/AuthContext';
import { SkeletonLobbyThemeGrid } from '../components/SkeletonCard';
import toast from 'react-hot-toast';

const TIMER_SECONDS = 20;

/* ── Play audio ─────────────────────────────────────────────────────────── */
const speak = (text, rate = 0.8) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

/* ── Web Audio Synth Sounds ── */
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 80);
    } else if (type === 'incorrect') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'fanfare') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const durations = [0.12, 0.12, 0.12, 0.35];
      let time = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + durations[idx]);
        osc.start(time);
        osc.stop(time + durations[idx]);
        time += durations[idx] - 0.02;
      });
    } else if (type === 'hint') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch { /* AudioContext blocked or unsupported */ }
};

/* ── Theme config helper ── */
const THEME_CONFIG = {
  AI: { color: '#a855f7', grad: 'from-purple-500 to-violet-700', bg: '#a855f715', emoji: '🤖', level: 'Nâng cao' },
  Cyber: { color: '#0ea5e9', grad: 'from-sky-500 to-blue-700', bg: '#0ea5e915', emoji: '🌐', level: 'Nâng cao' },
  Cyberpunk: { color: '#0ea5e9', grad: 'from-sky-400 to-cyan-700', bg: '#0ea5e915', emoji: '🌐', level: 'Nâng cao' },
  Tech: { color: '#3b82f6', grad: 'from-blue-500 to-indigo-700', bg: '#3b82f615', emoji: '⚙️', level: 'Cơ bản' },
  Security: { color: '#ef4444', grad: 'from-red-500 to-rose-700', bg: '#ef444415', emoji: '🛡️', level: 'Trung cấp' },
  Network: { color: '#22c55e', grad: 'from-green-500 to-emerald-700', bg: '#22c55e15', emoji: '📡', level: 'Trung cấp' },
  'Sci-Fi': { color: '#f59e0b', grad: 'from-amber-400 to-orange-600', bg: '#f59e0b15', emoji: '🚀', level: 'Trung cấp' },
  Data: { color: '#06b6d4', grad: 'from-cyan-500 to-teal-700', bg: '#06b6d415', emoji: '💾', level: 'Trung cấp' },
  Hack: { color: '#f97316', grad: 'from-orange-500 to-red-700', bg: '#f9731615', emoji: '💻', level: 'Nâng cao' },
  General: { color: '#8b5cf6', grad: 'from-violet-500 to-purple-700', bg: '#8b5cf615', emoji: '📚', level: 'Cơ bản' },
  'Space Travel': { color: '#6366f1', grad: 'from-indigo-500 to-purple-700', bg: '#6366f115', emoji: '🌌', level: 'Trung cấp' },
  Animals: { color: '#10b981', grad: 'from-emerald-400 to-teal-600', bg: '#10b98115', emoji: '🦁', level: 'Cơ bản' },
  Cooking: { color: '#f59e0b', grad: 'from-amber-400 to-orange-600', bg: '#f59e0b15', emoji: '🍳', level: 'Cơ bản' },
  'Job Interview': { color: '#6366f1', grad: 'from-indigo-500 to-purple-700', bg: '#6366f115', emoji: '💼', level: 'Nâng cao' },
  Business: { color: '#3b82f6', grad: 'from-blue-500 to-indigo-700', bg: '#3b82f615', emoji: '📈', level: 'Trung cấp' },
  Travel: { color: '#06b6d4', grad: 'from-cyan-500 to-teal-700', bg: '#06b6d415', emoji: '✈️', level: 'Cơ bản' },
  Music: { color: '#ec4899', grad: 'from-pink-500 to-rose-700', bg: '#ec489915', emoji: '🎵', level: 'Cơ bản' },
  Sports: { color: '#22c55e', grad: 'from-green-500 to-emerald-700', bg: '#22c55e15', emoji: '⚽', level: 'Cơ bản' },
  'Modern Tech': { color: '#3b82f6', grad: 'from-blue-500 to-indigo-700', bg: '#3b82f615', emoji: '⚙️', level: 'Trung cấp' }
};

const getThemeConfig = (t) => {
  if (!t || t === '__all__') return { color: '#6366f1', grad: 'from-indigo-500 to-purple-700', bg: '#6366f115', emoji: '🌍', level: 'Tất cả' };
  if (t === '__favorites__') return { color: '#ef4444', grad: 'from-rose-500 to-pink-700', bg: '#ef444415', emoji: '❤️', level: 'Đặc biệt' };

  const key = Object.keys(THEME_CONFIG).find(k => k.toLowerCase() === t.trim().toLowerCase());
  if (key) return THEME_CONFIG[key];

  const tLower = t.toLowerCase();
  if (tLower.includes('cyber')) return THEME_CONFIG['Cyberpunk'];
  if (tLower.includes('sci')) return THEME_CONFIG['Sci-Fi'];
  if (tLower.includes('space') || tLower.includes('universe')) return THEME_CONFIG['Space Travel'];
  if (tLower.includes('animal') || tLower.includes('pet')) return THEME_CONFIG['Animals'];
  if (tLower.includes('cook') || tLower.includes('food')) return THEME_CONFIG['Cooking'];
  if (tLower.includes('interview') || tLower.includes('job') || tLower.includes('work')) return THEME_CONFIG['Job Interview'];
  if (tLower.includes('business') || tLower.includes('money')) return THEME_CONFIG['Business'];
  if (tLower.includes('travel') || tLower.includes('trip')) return THEME_CONFIG['Travel'];
  if (tLower.includes('music') || tLower.includes('song')) return THEME_CONFIG['Music'];
  if (tLower.includes('sport') || tLower.includes('play')) return THEME_CONFIG['Sports'];
  if (tLower.includes('security') || tLower.includes('hack')) return THEME_CONFIG['Security'];
  if (tLower.includes('net')) return THEME_CONFIG['Network'];
  if (tLower.includes('ai') || tLower.includes('intelligence') || tLower.includes('robot')) return THEME_CONFIG['AI'];
  if (tLower.includes('tech')) return THEME_CONFIG['Tech'];

  return { color: '#6b7280', grad: 'from-gray-500 to-slate-700', bg: '#6b728015', emoji: '📝', level: 'Cơ bản' };
};

/* ── Question type badge ─────────────────────────────────────────────────── */
const TYPE_META = {
  multiple_choice: { label: 'Trắc Nghiệm', icon: <ListChecks className="w-3.5 h-3.5" />, color: 'var(--color-primary)' },
  fill_in_blank: { label: 'Điền Chỗ Trống', icon: <PenLine className="w-3.5 h-3.5" />, color: 'var(--color-accent)' },
  listening: { label: 'Nghe & Viết', icon: <Headphones className="w-3.5 h-3.5" />, color: '#ff9600' },
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.multiple_choice;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
      style={{ color: meta.color, background: meta.color + '15', border: `1px solid ${meta.color}30` }}
    >
      {meta.icon} {meta.label}
    </span>
  );
};

/* ── Progress dots ───────────────────────────────────────────────────────── */
const ProgressDots = ({ total, current, answers }) => (
  <div className="flex gap-1.5 flex-wrap justify-center select-none">
    {Array.from({ length: total }).map((_, i) => {
      const ans = answers[i];
      let bg = 'bg-[var(--color-surface-border)]';
      if (i < current) bg = ans?.correct ? 'bg-[#58cc02]' : 'bg-[#ff4b4b]';
      else if (i === current) bg = 'bg-[var(--color-primary)] animate-pulse';
      return (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${bg} ${i === current ? 'w-5 h-2.5' : 'w-2.5 h-2.5'}`}
        />
      );
    })}
  </div>
);

/* ── Result screen ───────────────────────────────────────────────────────── */
const ResultScreen = ({ score, total, answers, questions, onRestart, selectedTheme, onReviewMistakes, maxStreak, timeRecords, gameMode, timerDuration }) => {
  const pct = Math.round((score / total) * 100);
  const rank = pct >= 90 ? { label: 'Xuất Sắc 🏆', color: '#ffc800', icon: '🥇' }
    : pct >= 70 ? { label: 'Tuyệt Vời ⚡', color: 'var(--color-primary)', icon: '🥈' }
      : pct >= 50 ? { label: 'Đạt Yêu Cầu 🎯', color: '#58cc02', icon: '🥉' }
        : { label: 'Cố Gắng Lên 💡', color: '#ff4b4b', icon: '💪' };

  // Calculate achievements/badges
  const correctTimes = timeRecords.filter((_, idx) => answers[idx]?.correct);
  const avgTime = correctTimes.length > 0 ? (correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length) : 999;

  const badges = [];
  if (score === total && total > 0) {
    badges.push({ name: 'Thiên tài hoàn hảo', emoji: '🏆', desc: 'Đạt điểm tuyệt đối 100%', color: 'from-amber-400 to-yellow-600' });
  }
  if (avgTime < 3 && timerDuration !== 99999 && score > 0) {
    badges.push({ name: 'Xạ thủ thần tốc', emoji: '⚡', desc: 'Trả lời đúng trung bình dưới 3s', color: 'from-sky-400 to-blue-600' });
  }
  if (gameMode === 'survival' && score === total && total > 0) {
    badges.push({ name: 'Bất tử', emoji: '🛡️', desc: 'Hoàn thành sinh tồn nguyên vẹn', color: 'from-emerald-400 to-green-600' });
  }
  if (maxStreak >= 5) {
    badges.push({ name: 'Chuỗi thần thánh', emoji: '🔥', desc: 'Đạt chuỗi đúng liên tiếp >= 5 câu', color: 'from-orange-400 to-red-600' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Score ring */}
      <div className="card-3d p-8 text-center bg-[var(--color-surface)]">
        <p className="text-4xl mb-2 select-none">{rank.icon}</p>
        <h2 className="text-2xl font-black uppercase tracking-wider mb-6" style={{ color: rank.color }}>
          {rank.label}
        </h2>

        <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center select-none">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--color-surface-border)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42" fill="transparent"
              stroke={rank.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="264"
              initial={{ strokeDashoffset: 264 }}
              animate={{ strokeDashoffset: 264 - (264 * pct / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute text-center flex flex-col items-center">
            <motion.p
              className="text-4xl font-black text-[var(--color-text)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {pct}%
            </motion.p>
            <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase mt-0.5">{score}/{total} câu đúng</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Đúng', value: score, color: 'text-green-600', bg: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' },
            { label: 'Sai', value: total - score, color: 'text-red-500', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' },
            { label: 'Tổng số', value: total, color: 'text-[var(--color-text)]', bg: 'bg-[var(--color-bg)] border-[var(--color-surface-border)]' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border-2 p-3 text-center ${s.bg}`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {badges.length > 0 && (
          <div className="mt-6 border-t-2 border-[var(--color-surface-border)] pt-5 text-left select-none">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Huy hiệu đạt được</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((b) => (
                <div key={b.name} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-surface-border)]">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                    {b.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[var(--color-text)]">{b.name}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] font-medium">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center mt-6">
          {score < total && (
            <button onClick={onReviewMistakes} className="btn-3d-success flex items-center gap-2 px-6 py-3">
              <BookOpen className="w-4 h-4" /> Luyện câu sai
            </button>
          )}
          <button onClick={() => onRestart(selectedTheme)} className="btn-3d-primary flex items-center gap-2 px-6 py-3">
            <RotateCcw className="w-4 h-4" /> Làm lại
          </button>
          <button onClick={() => onRestart(null)} className="btn-3d-secondary flex items-center gap-2 px-6 py-3">
            <Layers className="w-4 h-4" /> Đổi chủ đề
          </button>
        </div>
      </div>

      {/* Answer breakdown */}
      <div className="card-3d p-6 bg-[var(--color-surface)]">
        <h3 className="font-black uppercase tracking-wider text-xs mb-4 flex items-center gap-2 text-[var(--color-text)]">
          <Brain className="w-4 h-4 text-[var(--color-primary)]" /> Phân tích đáp án chi tiết
        </h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = answers[i];
            const correct = ans?.correct;
            const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 ${correct
                    ? 'border-green-200 bg-green-50/50 dark:border-green-950/30 dark:bg-green-950/10'
                    : 'border-red-200 bg-red-50/50 dark:border-red-950/30 dark:bg-red-950/10'
                  }`}
              >
                <div className="mt-0.5 shrink-0 select-none">
                  {correct
                    ? <CheckCircle2 className="w-5 h-5 text-[#58cc02]" />
                    : <XCircle className="w-5 h-5 text-[#ff4b4b]" />
                  }
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-[var(--color-text)] leading-relaxed">{q.question}</p>
                  {!correct && q.correctAnswer && (
                    <p className="text-xs text-green-600 font-bold mt-1.5">
                      ✓ Đáp án đúng: <span className="underline">{q.correctAnswer}</span>
                    </p>
                  )}
                  {!correct && q.type === 'multiple_choice' && (
                    <p className="text-xs text-green-600 font-bold mt-1.5">
                      ✓ Đáp án đúng: <span className="underline">{options[q.answerIndex]}</span>
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <TypeBadge type={q.type} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Theme Lobby ─────────────────────────────────────────────────────────── */
const ThemeLobby = ({ quizThemes, vocabThemes, onStart, onAIGenerate, aiLoading, user, loadingThemes, historyList }) => {
  const allThemes = quizThemes.length > 0 ? quizThemes : [];
  const hasThemes = allThemes.length > 0;

  const getCount = (theme) => {
    const found = quizThemes.find(t => t.theme === theme);
    return found?.count || 0;
  };

  // Build display list: "All" first, then themes from quiz DB
  const themeList = hasThemes
    ? [{ theme: '__all__', count: quizThemes.reduce((s, t) => s + t.count, 0) }, ...quizThemes]
    : [{ theme: '__all__', count: 0 }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Hero section */}
      <div className="card-3d p-6 bg-[var(--color-surface)] text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br from-purple-500 to-blue-500 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br from-cyan-500 to-emerald-500 blur-2xl" />

        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-[var(--color-primary)] mb-1">
            Luyện đề phản xạ
          </h1>
          <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest">
            Chọn chủ đề bạn muốn luyện tập
          </p>
        </div>
      </div>

      {/* Theme grid */}
      <div className="card-3d p-5 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Chọn chủ đề
          </h2>
          {!hasThemes && !loadingThemes && (
            <span className="text-[10px] text-[var(--color-text-muted)] italic">Chưa có dữ liệu</span>
          )}
        </div>

        {loadingThemes ? (
          <SkeletonLobbyThemeGrid />
        ) : themeList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themeList.map(({ theme, count }, idx) => {
              const cfg = getThemeConfig(theme);
              const isAll = theme === '__all__';
              return (
                <motion.button
                  key={theme}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onStart(isAll ? '' : theme)}
                  disabled={count === 0 && !isAll}
                  className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isAll ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                  style={{
                    background: `linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}08 100%)`,
                    border: `2px solid ${cfg.color}30`,
                  }}
                >
                  {/* Glow effect top-right */}
                  <div
                    className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl"
                    style={{ background: cfg.color }}
                  />

                  <span className="text-2xl mb-2 block">{cfg.emoji}</span>
                  <p className="font-black text-sm text-[var(--color-text)] leading-tight">
                    {isAll ? 'Tất cả' : theme}
                  </p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: cfg.color }}>
                    {cfg.level}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                      {count} câu hỏi
                    </span>
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: cfg.color + '25' }}
                    >
                      <Play className="w-3 h-3" style={{ color: cfg.color }} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-[var(--color-secondary)] opacity-30 mx-auto mb-3 animate-pulse" />
            <p className="text-[var(--color-text-muted)] text-sm font-bold">Ngân hàng câu hỏi đang trống</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="card-3d p-5 bg-[var(--color-surface)]">
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          Thêm câu hỏi mới
        </p>
        <div>
          <button
            onClick={() => {
              if (!user) return toast.error('Bạn cần đăng nhập để sinh đề!');
              onAIGenerate();
            }}
            disabled={aiLoading}
            className="w-full btn-3d-primary flex items-center justify-center gap-2 py-2.5 text-xs"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI sinh đề
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main Quiz component ─────────────────────────────────────────────────── */
const Quiz = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [quizThemes, setQuizThemes] = useState([]);
  const [vocabThemes, setVocabThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null); // null = lobby, '' = all, 'Tech' = specific
  const [showAIThemeModal, setShowAIThemeModal] = useState(false);
  const [selectedAITheme, setSelectedAITheme] = useState('Cyberpunk');
  const [customAITheme, setCustomAITheme] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loadingThemes, setLoadingThemes] = useState(true);

  // Pre-game settings & Survival mode states
  const [setupTheme, setSetupTheme] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [timerDuration, setTimerDuration] = useState(20); // 10, 20, 30, 99999 (unlimited)
  const [gameMode, setGameMode] = useState('standard'); // 'standard' | 'survival'
  const [lives, setLives] = useState(3);

  // Hints, achievements & history states
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeRecords, setTimeRecords] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintActive, setHintActive] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isReview, setIsReview] = useState(false);

  const inputRef = useRef(null);

  const { timeLeft, resetTimer } = useTimer(
    timerDuration,
    () => handleAnswer(null, true),
    !isAnswered && !showResult && !loading && questions.length > 0 && selectedTheme !== null && timerDuration !== 99999
  );

  /* ── Notify AIHelper khi answer banner xuất hiện/ẩn ── */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('quiz:answerBanner', { detail: { visible: isAnswered && !showResult } }));
  }, [isAnswered, showResult]);

  // Reset khi rời quiz
  useEffect(() => {
    return () => window.dispatchEvent(new CustomEvent('quiz:answerBanner', { detail: { visible: false } }));
  }, []);

  /* ── Fetch quiz themes ── */
  const fetchQuizThemes = async () => {
    try {
      const data = await getQuizThemes();
      setQuizThemes(data);
    } catch { /* silent */ }
  };

  const fetchVocabThemes = async () => {
    try {
      const data = await getThemes();
      setVocabThemes(data);
    } catch { /* silent */ }
  };

  const loadHistory = () => {
    try {
      const list = JSON.parse(localStorage.getItem('cyberlingo_quiz_history') || '[]');
      setHistoryList(list);
    } catch { /* silent */ }
  };

  const saveHistory = (theme, score, total, mode) => {
    try {
      const history = JSON.parse(localStorage.getItem('cyberlingo_quiz_history') || '[]');
      const newEntry = {
        date: new Date().toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        theme: theme === '' ? 'Tất cả' : (theme || 'Tất cả'),
        score,
        total,
        mode: mode === 'survival' ? 'Sinh tồn 💖' : 'Phổ thông 🧠',
        pct: Math.round((score / total) * 100)
      };
      const updated = [newEntry, ...history].slice(0, 10);
      localStorage.setItem('cyberlingo_quiz_history', JSON.stringify(updated));
    } catch { /* silent */ }
  };

  const getHintText = (word) => {
    if (!word) return '';
    const trimmed = word.trim();
    if (trimmed.length <= 1) return trimmed;
    return trimmed[0] + ' ' + '_ '.repeat(trimmed.length - 1).trim();
  };

  useEffect(() => {
    const load = async () => {
      setLoadingThemes(true);
      loadHistory();
      await Promise.all([fetchQuizThemes(), fetchVocabThemes()]);
      setLoadingThemes(false);
    };
    load();
  }, []);

  /* ── Start quiz with a theme ── */
  const startQuiz = async (theme) => {
    setSelectedTheme(theme);
    setLoading(true);
    setError(null);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelectedOption(null);
    setTypedAnswer('');
    setShowResult(false);
    setStreak(0);
    setLives(3);
    setMaxStreak(0);
    setTimeRecords([]);
    setHintsUsed(0);
    setHintActive(false);
    setHiddenOptions([]);
    setIsReview(false);
    try {
      const data = await getRandomQuiz({ limit: questionCount, theme: theme || '' });
      if (data?.length > 0) {
        setQuestions(data);
      } else {
        setError(`Chủ đề "${theme || 'Tất cả'}" chưa có câu hỏi. Hãy sinh thêm bằng AI!`);
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Go back to lobby ── */
  const goToLobby = () => {
    setSelectedTheme(null);
    setQuestions([]);
    setShowResult(false);
    setError(null);
    setStreak(0);
    setMaxStreak(0);
    setTimeRecords([]);
    setHintsUsed(0);
    setHintActive(false);
    setHiddenOptions([]);
    loadHistory();
    fetchQuizThemes();
  };

  /* ── AI Generate ── */
  const handleAIGenerate = async (theme = 'Cyberpunk') => {
    if (!user) return toast.error('Bạn cần đăng nhập để sinh đề!');
    setAiLoading(true);
    const id = toast.loading(`AI đang thiết kế bộ đề trắc nghiệm chủ đề "${theme}"...`);
    try {
      await generateAIWords(theme);
      toast.success('AI tạo bộ đề trắc nghiệm thành công!', { id });
      await Promise.all([fetchQuizThemes(), fetchVocabThemes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể liên kết AI.', { id });
    } finally {
      setAiLoading(false);
    }
  };


  /* ── Auto-play for listening questions ── */
  useEffect(() => {
    if (questions.length > 0 && !loading && !showResult) {
      const q = questions[currentQ];
      if (q?.type === 'listening' || q?.isAudio) {
        const t = setTimeout(() => speak(q.correctAnswer), 600);
        return () => clearTimeout(t);
      }
    }
  }, [currentQ, questions, loading, showResult]);

  /* ── Auto-focus text input ── */
  useEffect(() => {
    if (!isAnswered && questions[currentQ]?.type !== 'multiple_choice') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentQ, isAnswered]);

  /* ── Answer check logic ── */
  const handleAnswer = (rawAnswer, timedOut = false) => {
    if (isAnswered) return;
    const q = questions[currentQ];
    let given = timedOut ? null : rawAnswer;
    let isCorrect = false;
    if (!timedOut) {
      if (q.type === 'multiple_choice') {
        isCorrect = rawAnswer === q.answerIndex;
      } else {
        isCorrect = rawAnswer?.toString().toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
      }
    }
    setSelectedOption(q.type === 'multiple_choice' ? given : null);
    setIsAnswered(true);
    if (isCorrect) {
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      playSound('correct');
    } else {
      setStreak(0);
      playSound('incorrect');
      if (gameMode === 'survival') {
        setLives((l) => Math.max(0, l - 1));
      }
    }
    const timeSpent = timerDuration !== 99999 ? (timerDuration - timeLeft) : 0;
    setTimeRecords((prev) => [...prev, timeSpent]);
    setAnswers((prev) => [...prev, { correct: isCorrect, given }]);
  };

  /* ── Next question ── */
  const nextQuestion = async () => {
    setHintActive(false);
    setHiddenOptions([]);
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedOption(null);
      setTypedAnswer('');
      setIsAnswered(false);
      resetTimer();
    } else {
      setShowResult(true);
      playSound('fanfare');
      if (!isReview) {
        saveHistory(selectedTheme, score, questions.length, gameMode);
        if (user) {
          try {
            const result = await submitQuiz(score, questions.length, maxStreak);
            toast.success(`Nhận thêm +${result.earnedXp} XP!`, { icon: '⚡' });
          } catch { /* silent */ }
        }
      } else {
        toast.success('Hoàn thành ôn tập câu sai!', { icon: '📖' });
      }
    }
  };

  const handleReviewMistakes = () => {
    const incorrectQs = questions.filter((_, idx) => !answers[idx]?.correct);
    if (incorrectQs.length === 0) return;
    setQuestions(incorrectQs);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setShowResult(false);
    setStreak(0);
    setLives(3);
    setMaxStreak(0);
    setTimeRecords([]);
    setHintsUsed(0);
    setHintActive(false);
    setHiddenOptions([]);
    setIsReview(true);
    resetTimer();
  };

  const endQuizEarly = async () => {
    setShowResult(true);
    playSound('fanfare');
    if (!isReview) {
      saveHistory(selectedTheme, score, answers.length, gameMode);
      if (user) {
        try {
          const result = await submitQuiz(score, answers.length, maxStreak);
          toast.success(`Nhận thêm +${result.earnedXp} XP!`, { icon: '⚡' });
        } catch { /* silent */ }
      }
    } else {
      toast.success('Kết thúc ôn tập câu sai!', { icon: '📖' });
    }
  };

  const handleUseHint = () => {
    if (isAnswered || hintActive || hintsUsed >= 2) return;
    setHintsUsed((h) => h + 1);
    setHintActive(true);
    playSound('hint');

    const q = questions[currentQ];
    if (q.type === 'multiple_choice') {
      const correctIdx = q.answerIndex;
      const incorrectIndices = [];
      const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
      opts.forEach((_, idx) => {
        if (idx !== correctIdx) incorrectIndices.push(idx);
      });
      const shuffled = incorrectIndices.sort(() => 0.5 - Math.random());
      setHiddenOptions(shuffled.slice(0, 2));
    }
  };

  const playAudio = () => {
    const q = questions[currentQ];
    speak(q.correctAnswer || '', 0.75);
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER STATES
  ════════════════════════════════════════════════════════════════════════ */

  const q = questions[currentQ];
  const options = q ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')) : [];
  const timerPct = timerDuration === 99999 ? 0 : (timeLeft / timerDuration) * 100;
  const timerColor = timeLeft <= 5 ? '#ff4b4b' : timeLeft <= 10 ? '#ff9600' : 'var(--color-primary)';
  const currentAnswerObj = answers[currentQ];
  const isCorrectAnswer = currentAnswerObj?.correct;
  const isOutOfLives = gameMode === 'survival' && (lives === 0 || (!isCorrectAnswer && lives === 1 && isAnswered));

  /* ── Keyboard shortcut for Continue (Enter key) ── */
  const nextQuestionRef = useRef(nextQuestion);
  const endQuizEarlyRef = useRef(endQuizEarly);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);
  useEffect(() => { endQuizEarlyRef.current = endQuizEarly; }, [endQuizEarly]);

  useEffect(() => {
    const handleEnterKey = (e) => {
      if (e.key === 'Enter' && isAnswered && !showResult) {
        e.preventDefault();
        if (isOutOfLives) {
          endQuizEarlyRef.current?.();
        } else {
          nextQuestionRef.current?.();
        }
      }
    };
    window.addEventListener('keydown', handleEnterKey);
    return () => window.removeEventListener('keydown', handleEnterKey);
  }, [isAnswered, isOutOfLives, showResult]);

  const getCorrectAnswerText = () => {
    if (!q) return '';
    if (q.type === 'multiple_choice') return options[q.answerIndex] || '';
    return q.correctAnswer || '';
  };

  const cfg = getThemeConfig(selectedTheme);

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-2xl mx-auto pb-32 px-4 bg-[var(--color-bg)] pt-4"
    >
      <AnimatePresence mode="wait">

        {/* ════ LOBBY ════ */}
        {selectedTheme === null && !loading && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ThemeLobby
              quizThemes={quizThemes}
              vocabThemes={vocabThemes}
              onStart={(theme) => {
                setSetupTheme(theme);
              }}
              onAIGenerate={() => {
                setSelectedAITheme('Cyberpunk');
                setCustomAITheme('');
                setShowAIThemeModal(true);
              }}
              aiLoading={aiLoading}
              user={user}
              loadingThemes={loadingThemes}
              historyList={historyList}
            />
          </motion.div>
        )}

        {/* ════ LOADING ════ */}
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
            <span className="font-bold text-[var(--color-primary)] text-sm">Đang nạp bộ đề...</span>
          </motion.div>
        )}

        {/* ════ ERROR ════ */}
        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-lg mx-auto py-10 text-center space-y-5 px-4"
          >
            <Brain className="w-16 h-16 text-[var(--color-secondary)] opacity-40 mx-auto animate-pulse" />
            <p className="text-[var(--color-secondary)] font-bold text-base">{error}</p>
            <div className="flex justify-center">
              <button onClick={goToLobby} className="btn-3d-primary flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </button>
            </div>
          </motion.div>
        )}

        {/* ════ QUIZ / RESULT ════ */}
        {!loading && !error && selectedTheme !== null && questions.length > 0 && (
          <motion.div key="quiz-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ── Header ── */}
            <header className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)] p-4 rounded-2xl border-2 border-[var(--color-surface-border)] select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={goToLobby}
                  className="w-8 h-8 rounded-xl border-2 border-[var(--color-surface-border)] flex items-center justify-center hover:bg-[var(--color-bg)] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
                <div>
                  <h1 className="text-base font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
                    <span className="text-lg">{cfg.emoji}</span>
                    {selectedTheme || 'Tất cả chủ đề'}
                  </h1>
                  <p className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wider">
                    Luyện đề phản xạ nơ-ron
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!user) return toast.error('Bạn cần đăng nhập để sinh đề!');
                    setSelectedAITheme(selectedTheme || 'Cyberpunk');
                    setCustomAITheme('');
                    setShowAIThemeModal(true);
                  }}
                  disabled={aiLoading}
                  className="btn-3d-primary flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI sinh đề
                </button>
              </div>
            </header>

            <AnimatePresence mode="wait">
              {!showResult ? (
                <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* ── Top meta bar ── */}
                  <div className="flex items-center justify-between mb-5 gap-4 bg-[var(--color-surface)] p-3 rounded-2xl border-2 border-[var(--color-surface-border)]">
                    <ProgressDots total={questions.length} current={currentQ} answers={answers} />
                    <div className="flex items-center gap-2 shrink-0 select-none">
                      {gameMode === 'survival' && (
                        <div className="flex gap-0.5 px-2 py-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl mr-1 shrink-0">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Heart
                              key={i}
                              className={`w-3.5 h-3.5 ${i < lives
                                  ? 'text-red-500 fill-current animate-pulse-slow'
                                  : 'text-gray-300 dark:text-slate-700'
                                }`}
                            />
                          ))}
                        </div>
                      )}
                      <AnimatePresence mode="wait">
                        {streak >= 2 && (
                          <motion.div
                            key={streak}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1.2, 0.9, 1], opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl text-orange-600 font-black text-xs"
                          >
                            <span className="animate-bounce-slow">🔥</span>
                            <span>x{streak}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-bg)] rounded-xl border border-[var(--color-surface-border)]">
                        <Zap className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        <span className="font-black text-xs text-[var(--color-text)]">{score}</span>
                        <span className="text-[var(--color-text-muted)] text-[10px] font-bold">/{currentQ + (isAnswered ? 1 : 0)}</span>
                      </div>
                      {timerDuration !== 99999 && (
                        <div
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 font-mono font-bold text-xs transition-all"
                          style={{ color: timerColor, borderColor: timerColor + '30', background: timerColor + '08' }}
                        >
                          <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'animate-pulse' : ''}`} />
                          {String(timeLeft).padStart(2, '0')}s
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Question card ── */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQ}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="card-3d relative overflow-hidden bg-[var(--color-surface)]"
                    >
                      {/* Timer bar */}
                      {timerDuration !== 99999 && (
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-surface-border)]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: timerColor }}
                            initial={{ width: '100%' }}
                            animate={{ width: `${timerPct}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                          />
                        </div>
                      )}

                      <div className="p-6 pt-8">
                        <div className="flex justify-between items-center mb-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">
                              Câu hỏi {currentQ + 1} / {questions.length}
                            </span>
                            {!isAnswered && (
                              <button
                                onClick={handleUseHint}
                                disabled={hintActive || hintsUsed >= 2}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black transition-all hover:bg-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                style={{
                                  borderColor: hintActive ? 'var(--color-secondary)' : 'var(--color-surface-border)',
                                  color: hintActive ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                                  background: hintActive ? 'rgba(255, 150, 0, 0.08)' : 'transparent',
                                }}
                              >
                                <span>💡</span>
                                <span>Gợi ý ({2 - hintsUsed})</span>
                              </button>
                            )}
                          </div>
                          <TypeBadge type={q.type} />
                        </div>

                        <h2 className="text-xl font-bold leading-relaxed mb-6 text-[var(--color-text)] text-left">{q.question}</h2>

                        {/* Listening audio */}
                        {(q.type === 'listening' || q.isAudio) && (
                          <button
                            onClick={playAudio}
                            className="w-full mb-6 py-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 dark:border-orange-900 dark:bg-orange-950/20 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider text-orange-600 transition-all"
                          >
                            <Volume2 className="w-5 h-5 text-orange-500 fill-current animate-bounce-slow" />
                            Bấm nghe phát âm
                          </button>
                        )}

                        {/* Multiple choice */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-3">
                            {options.map((opt, idx) => {
                              const isHidden = hintActive && hiddenOptions.includes(idx);
                              if (isHidden) {
                                return <div key={idx} className="h-0 opacity-0 pointer-events-none transition-all duration-300" />;
                              }
                              let btnStyle = 'border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)]';
                              let borderBottomColor = undefined;
                              let icon = null;
                              if (isAnswered) {
                                if (idx === q.answerIndex) {
                                  btnStyle = 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900 border-b-[4px]';
                                  borderBottomColor = '#46a302';
                                  icon = <CheckCircle2 className="w-5 h-5 text-[#58cc02] shrink-0" />;
                                } else if (idx === selectedOption) {
                                  btnStyle = 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900 border-b-[4px]';
                                  borderBottomColor = '#ea2b2b';
                                  icon = <XCircle className="w-5 h-5 text-[#ff4b4b] shrink-0" />;
                                } else {
                                  btnStyle = 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] opacity-55 cursor-not-allowed';
                                }
                              }
                              return (
                                <motion.button
                                  key={idx}
                                  whileHover={!isAnswered ? { scale: 1.005 } : {}}
                                  onClick={() => !isAnswered && handleAnswer(idx)}
                                  disabled={isAnswered}
                                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 font-bold text-sm active:translate-y-[2px] cursor-pointer ${btnStyle}`}
                                  style={{ borderBottomColor }}
                                >
                                  <span
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border"
                                    style={{
                                      background: isAnswered && idx === q.answerIndex ? 'rgba(88,204,2,0.15)'
                                        : isAnswered && idx === selectedOption ? 'rgba(255,75,75,0.15)'
                                          : 'rgba(0,0,0,0.02)',
                                    }}
                                  >
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {icon}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}

                        {(q.type === 'fill_in_blank' || q.type === 'listening') && (
                          <div className="space-y-3">
                            <input
                              ref={inputRef}
                              type="text"
                              value={typedAnswer}
                              onChange={(e) => setTypedAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isAnswered && typedAnswer.trim()) {
                                  handleAnswer(typedAnswer.trim());
                                }
                              }}
                              disabled={isAnswered}
                              placeholder="Điền từ còn thiếu vào đây rồi ấn Enter..."
                              className={`w-full rounded-2xl border-2 py-4 px-5 text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none font-bold text-sm transition-all placeholder:text-[var(--color-text-muted)] ${!isAnswered
                                  ? 'border-[var(--color-surface-border)] focus:border-[var(--color-primary)]'
                                  : typedAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()
                                    ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900'
                                    : 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
                                }`}
                            />
                            {!isAnswered && typedAnswer.trim() && (
                              <button
                                onClick={() => handleAnswer(typedAnswer.trim())}
                                className="w-full btn-3d-primary py-3 text-sm font-black uppercase tracking-wider select-none"
                              >
                                Kiểm tra
                              </button>
                            )}
                            {hintActive && (
                              <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-orange-500 font-bold flex items-center gap-1.5"
                              >
                                <span>💡 Gợi ý chữ cái:</span>
                                <span className="font-mono tracking-widest bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900">
                                  {getHintText(q.correctAnswer)}
                                </span>
                              </motion.p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* ── Answer banner ── */}
                  <AnimatePresence>
                    {isAnswered && (
                      <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 150, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className={`fixed bottom-0 left-0 right-0 z-50 py-5 px-6 border-t-4 shadow-2xl flex items-center justify-between ${isCorrectAnswer
                            ? 'bg-green-50 dark:bg-green-950 border-green-500 text-green-800 dark:text-green-200'
                            : 'bg-red-50 dark:bg-red-950 border-red-500 text-red-800 dark:text-red-200'
                          }`}
                      >
                        <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4 text-left w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-md shrink-0 ${isCorrectAnswer ? 'bg-[#58cc02]' : 'bg-[#ff4b4b]'}`}>
                              {isCorrectAnswer ? '✓' : '✗'}
                            </div>
                            <div>
                              <h4 className="text-base font-black uppercase tracking-wider leading-none">
                                {isCorrectAnswer ? 'Tuyệt vời! Chính xác' : 'Sai mất rồi!'}
                              </h4>
                              {!isCorrectAnswer && (
                                <p className="text-xs font-bold mt-1">
                                  Đáp án đúng: <span className="underline">{getCorrectAnswerText()}</span>
                                </p>
                              )}
                              {isCorrectAnswer && (
                                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-1 uppercase tracking-wider">
                                  {streak >= 2 ? `🔥 Chuỗi đúng x${streak}! +20 XP` : '+20 XP phản xạ nơ-ron'}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={isOutOfLives ? endQuizEarly : nextQuestion}
                            className={`w-full md:w-auto select-none py-3 px-8 text-xs font-black rounded-2xl uppercase tracking-wider ${isCorrectAnswer ? 'btn-3d-success' : 'btn-3d-danger'
                              }`}
                          >
                            {isOutOfLives || currentQ >= questions.length - 1 ? 'Xem kết quả' : 'Tiếp tục'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ResultScreen
                    score={score}
                    total={answers.length}
                    answers={answers}
                    questions={questions.slice(0, answers.length)}
                    onRestart={(theme) => {
                      if (theme === null) {
                        goToLobby();
                      } else {
                        startQuiz(theme);
                      }
                    }}
                    selectedTheme={selectedTheme}
                    onReviewMistakes={handleReviewMistakes}
                    maxStreak={maxStreak}
                    timeRecords={timeRecords}
                    gameMode={gameMode}
                    timerDuration={timerDuration}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Setup Modal ══ */}
      <AnimatePresence>
        {setupTheme !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-3d w-full max-w-md p-6 relative flex flex-col gap-4 bg-[var(--color-surface)]"
            >
              <button
                onClick={() => setSetupTheme(null)}
                className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-text)]">
                  Cài đặt phòng luyện
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mt-0.5">
                  Chủ đề: {setupTheme === '' ? 'Tất cả' : setupTheme}
                </p>
              </div>

              <div className="space-y-4 my-2 text-left">
                {/* Question Count */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    Số câu hỏi:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${questionCount === num
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                            : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                      >
                        {num} câu
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    Thời gian mỗi câu:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 99999].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setTimerDuration(sec)}
                        className={`py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${timerDuration === sec
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                            : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                      >
                        {sec === 99999 ? 'Vô hạn' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    Chế độ chơi:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'standard', label: '🧠 Phổ thông', desc: 'Luyện tập thoải mái' },
                      { id: 'survival', label: '💖 Sinh tồn', desc: 'Có 3 Tim (mạng)' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setGameMode(m.id)}
                        className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${gameMode === m.id
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                            : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                      >
                        <span>{m.label}</span>
                        <span className="text-[9px] opacity-70 font-normal mt-0.5">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)] shrink-0">
                <button type="button" onClick={() => setSetupTheme(null)} className="flex-1 btn-3d-secondary py-2.5">
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const theme = setupTheme;
                    setSetupTheme(null);
                    startQuiz(theme);
                  }}
                  className="flex-1 btn-3d-primary py-2.5"
                >
                  Bắt đầu chơi ⚡
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ AI Theme Modal ══ */}
      <AnimatePresence>
        {showAIThemeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-3d w-full max-w-lg max-h-[90vh] p-6 relative flex flex-col gap-4 bg-[var(--color-surface)]"
            >
              <button
                onClick={() => setShowAIThemeModal(false)}
                className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-6 h-6 text-[var(--color-primary)] animate-pulse" />
                  <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-text)]">
                    Trí tuệ nhân tạo sinh đề mới
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                  Gemini AI sẽ tạo bộ câu hỏi trắc nghiệm và điền vào chỗ trống theo chủ đề bạn chọn.
                </p>
              </div>

              {/* Preset themes */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 min-h-0 pb-2">
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Chủ đề:</span>
                  <select
                    value={customAITheme ? '' : selectedAITheme}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedAITheme(e.target.value);
                        setCustomAITheme('');
                      }
                    }}
                    className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all font-bold text-xs"
                  >
                    {customAITheme && <option value="">-- Chủ đề tự chọn/điền: {customAITheme} --</option>}
                    {(vocabThemes.length > 0 ? vocabThemes.map(t => t.theme) : ['Cyberpunk', 'Sci-Fi', 'Tech', 'Security', 'Network', 'AI']).map((themeName) => {
                      const cfg = getThemeConfig(themeName);
                      return (
                        <option key={themeName} value={themeName}>
                          {cfg.emoji} {themeName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Quick select suggestions */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Gợi ý chủ đề khác (Click để chọn):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Space Travel 🌌', value: 'Space Travel' },
                      { label: 'Animals 🦁', value: 'Animals' },
                      { label: 'Cooking 🍳', value: 'Cooking' },
                      { label: 'Job Interview 💼', value: 'Job Interview' },
                      { label: 'Business 📈', value: 'Business' },
                      { label: 'Travel ✈️', value: 'Travel' },
                      { label: 'Music 🎵', value: 'Music' },
                      { label: 'Sports ⚽', value: 'Sports' }
                    ].map((item) => {
                      const isSelected = customAITheme.toLowerCase() === item.value.toLowerCase();
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setCustomAITheme(item.value);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${isSelected
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                              : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                            }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Hoặc tự điền chủ đề:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Job Interview, Travel, Business, Food..."
                    value={customAITheme}
                    onChange={(e) => setCustomAITheme(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all font-bold text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)] shrink-0">
                <button type="button" onClick={() => setShowAIThemeModal(false)} className="flex-1 btn-3d-secondary py-2.5">
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowAIThemeModal(false);
                    const finalTheme = customAITheme.trim() || selectedAITheme;
                    await handleAIGenerate(finalTheme);
                  }}
                  className="flex-1 btn-3d-primary py-2.5"
                >
                  Bắt đầu sinh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Quiz;
