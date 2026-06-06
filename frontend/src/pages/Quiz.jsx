import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, Database, Volume2,
  Sparkles, Trophy, Brain, RotateCcw, ChevronRight, Clock,
  Headphones, PenLine, ListChecks, Zap, Heart, X
} from 'lucide-react';
import { getRandomQuiz, submitQuiz } from '../services/quizService';
import { seedDatabase, generateAIWords } from '../services/seedService';
import { getThemes } from '../services/vocabularyService';
import { useTimer } from '../hooks/useTimer';
import { pageVariants } from '../animations/variants';
import { useAuth } from '../context/AuthContext';
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

/* ── Theme config helper ── */
const THEME_CONFIG = {
  AI: { color: '#a855f7', bg: '#a855f715', emoji: '🤖', level: 'Advanced' },
  Cyber: { color: '#0ea5e9', bg: '#0ea5e915', emoji: '🌐', level: 'Advanced' },
  Cyberpunk: { color: '#0ea5e9', bg: '#0ea5e915', emoji: '🌐', level: 'Advanced' },
  Tech: { color: '#3b82f6', bg: '#3b82f615', emoji: '⚙️', level: 'Beginner' },
  Security: { color: '#ef4444', bg: '#ef444415', emoji: '🛡️', level: 'Intermediate' },
  Network: { color: '#22c55e', bg: '#22c55e15', emoji: '📡', level: 'Intermediate' },
  'Sci-Fi': { color: '#f59e0b', bg: '#f59e0b15', emoji: '🚀', level: 'Intermediate' },
  Data: { color: '#06b6d4', bg: '#06b6d415', emoji: '💾', level: 'Intermediate' },
  Hack: { color: '#f97316', bg: '#f9731615', emoji: '💻', level: 'Advanced' },
  General: { color: '#8b5cf6', bg: '#8b5cf615', emoji: '📚', level: 'Beginner' },
};

const getThemeConfig = (t) => {
  if (t === '__favorites__') return { color: '#ef4444', bg: '#ef444415', emoji: '❤️', level: 'Special' };
  const key = Object.keys(THEME_CONFIG).find(k => k.toLowerCase() === t.toLowerCase());
  return THEME_CONFIG[key] || { color: '#6b7280', bg: '#6b728015', emoji: '📝', level: 'Beginner' };
};

/* ── Question type badge ─────────────────────────────────────────────────── */
const TYPE_META = {
  multiple_choice: { label: 'Trắc Nghiệm', icon: <ListChecks className="w-3.5 h-3.5" />, color: 'var(--color-primary)' },
  fill_in_blank:   { label: 'Điền Chỗ Trống', icon: <PenLine className="w-3.5 h-3.5" />, color: 'var(--color-accent)' },
  listening:       { label: 'Nghe & Viết', icon: <Headphones className="w-3.5 h-3.5" />, color: '#ff9600' },
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
const ResultScreen = ({ score, total, answers, questions, onRestart }) => {
  const pct = Math.round((score / total) * 100);
  const rank = pct >= 90 ? { label: 'Xuất Sắc 🏆', color: '#ffc800', icon: '🥇' }
    : pct >= 70 ? { label: 'Tuyệt Vời ⚡', color: 'var(--color-primary)', icon: '🥈' }
    : pct >= 50 ? { label: 'Đạt Yêu Cầu 🎯', color: '#58cc02', icon: '🥉' }
    : { label: 'Cố Gắng Lên 💡', color: '#ff4b4b', icon: '💪' };

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

        <button onClick={onRestart} className="btn-3d-primary flex items-center gap-2 mx-auto px-8 py-3">
          <RotateCcw className="w-4 h-4" /> Làm lại bài quiz
        </button>
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
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 ${
                  correct 
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

/* ── Main Quiz component ─────────────────────────────────────────────────── */
const Quiz = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [themes, setThemes] = useState([]);
  const [showAIThemeModal, setShowAIThemeModal] = useState(false);
  const [selectedAITheme, setSelectedAITheme] = useState('Cyberpunk');
  const [customAITheme, setCustomAITheme] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState([]); // { correct: bool, given: any }
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const inputRef = useRef(null);

  const { timeLeft, resetTimer } = useTimer(
    TIMER_SECONDS,
    () => handleAnswer(null, true), // timeout → wrong
    !isAnswered && !showResult && !loading && questions.length > 0
  );

  /* ── Fetch questions ── */
  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setShowResult(false);
    try {
      const data = await getRandomQuiz();
      if (data?.length > 0) {
        setQuestions(data);
      } else {
        setError('Ngân hàng câu hỏi hiện tại đang trống. Hãy bấm nạp dữ liệu.');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async (theme = 'Cyberpunk') => {
    if (!user) return toast.error('Bạn cần đăng nhập để sinh đề!');
    setAiLoading(true);
    const id = toast.loading(`AI đang thiết kế bộ đề trắc nghiệm chủ đề "${theme}"...`);
    try {
      await generateAIWords(theme);
      toast.success('AI tạo bộ đề trắc nghiệm thành công!', { id });
      await Promise.all([fetchQuestions(), fetchThemes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể liên kết AI.', { id });
    } finally {
      setAiLoading(false);
    }
  };

  const fetchThemes = async () => {
    try {
      const data = await getThemes();
      setThemes(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchQuestions();
    fetchThemes();
  }, []);

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

  /* ── Auto-focus text input for text questions ── */
  useEffect(() => {
    if (!isAnswered && questions[currentQ]?.type !== 'multiple_choice') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentQ, isAnswered]);

  /* ── Seed ── */
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const data = await seedDatabase();
      toast.success(data.message || 'Khởi tạo dữ liệu thành công!');
      setError(null);
      await Promise.all([fetchQuestions(), fetchThemes()]);
    } catch {
      toast.error('Lỗi khi khởi tạo dữ liệu mẫu.');
    } finally {
      setSeeding(false);
    }
  };

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
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { correct: isCorrect, given }]);
  };

  /* ── Next question ── */
  const nextQuestion = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedOption(null);
      setTypedAnswer('');
      setIsAnswered(false);
      resetTimer();
    } else {
      setShowResult(true);
      if (user) {
        try {
          const result = await submitQuiz(score + (answers[answers.length - 1]?.correct ? 0 : 0), questions.length);
          toast.success(`Nhận thêm +${result.earnedXp} XP!`, { icon: '⚡' });
        } catch { /* silent */ }
      }
    }
  };

  const playAudio = () => {
    const q = questions[currentQ];
    speak(q.correctAnswer || '', 0.75);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
      <span className="font-bold text-[var(--color-primary)] text-sm">Đang nạp bộ đề trắc nghiệm...</span>
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-6 px-4">
      <Brain className="w-16 h-16 text-[var(--color-secondary)] opacity-40 mx-auto animate-pulse" />
      <p className="text-[var(--color-secondary)] font-bold text-lg">{error}</p>
      {error.includes('trống') && (
        <button onClick={handleSeed} disabled={seeding} className="btn-3d-primary flex items-center gap-2 mx-auto">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Khởi tạo dữ liệu mẫu
        </button>
      )}
    </div>
  );

  if (questions.length === 0) return null;
  const q = questions[currentQ];
  const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? '#ff4b4b' : timeLeft <= 10 ? '#ff9600' : 'var(--color-primary)';
  
  const currentAnswerObj = answers[currentQ];
  const isCorrectAnswer = currentAnswerObj?.correct;
  
  const getCorrectAnswerText = () => {
    if (q.type === 'multiple_choice') {
      return options[q.answerIndex] || '';
    }
    return q.correctAnswer || '';
  };

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-2xl mx-auto pb-32 px-4 bg-[var(--color-bg)] pt-4"
    >
      {/* ── Header ── */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface)] p-4 rounded-2xl border-2 border-[var(--color-surface-border)] select-none">
        <div className="text-left">
          <h1 className="text-xl font-black uppercase tracking-wider text-[var(--color-primary)] mb-0.5 flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--color-primary)]" /> Luyện đề phản xạ
          </h1>
          <p className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wider">Tối ưu phản xạ nơ-ron từ vựng</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!user) return toast.error('Bạn cần đăng nhập để sinh đề!');
              setSelectedAITheme('Cyberpunk');
              setCustomAITheme('');
              setShowAIThemeModal(true);
            }}
            disabled={aiLoading}
            className="btn-3d-primary flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>AI sinh đề</span>
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn-3d-secondary flex items-center gap-1.5 px-3.5 py-2.5 text-xs rounded-xl"
          >
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
            <span>Reset đề</span>
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ── Top meta bar ── */}
            <div className="flex items-center justify-between mb-5 gap-4 bg-[var(--color-surface)] p-3 rounded-2xl border-2 border-[var(--color-surface-border)]">
              <ProgressDots total={questions.length} current={currentQ} answers={answers} />
              
              <div className="flex items-center gap-3 shrink-0 select-none">
                {/* Score */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-bg)] rounded-xl border border-[var(--color-surface-border)]">
                  <Zap className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                  <span className="font-black text-xs text-[var(--color-text)]">{score}</span>
                  <span className="text-[var(--color-text-muted)] text-[10px] font-bold">/{currentQ + (isAnswered ? 1 : 0)}</span>
                </div>
                {/* Timer */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 font-mono font-bold text-xs transition-all"
                  style={{
                    color: timerColor,
                    borderColor: timerColor + '30',
                    background: timerColor + '08',
                  }}
                >
                  <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'animate-pulse' : ''}`} />
                  {String(timeLeft).padStart(2, '0')}s
                </div>
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
                {/* Duolingo style top horizontal bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-surface-border)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: timerColor }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>

                <div className="p-6 pt-8">
                  {/* Top line metadata */}
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">
                      Câu hỏi {currentQ + 1} / {questions.length}
                    </span>
                    <TypeBadge type={q.type} />
                  </div>

                  {/* Question Title */}
                  <h2 className="text-xl font-bold leading-relaxed mb-6 text-[var(--color-text)] text-left">{q.question}</h2>

                  {/* Listening audio prompt */}
                  {(q.type === 'listening' || q.isAudio) && (
                    <button
                      onClick={playAudio}
                      className="w-full mb-6 py-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 dark:border-orange-900 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider text-orange-600 transition-all group active:scale-98"
                    >
                      <Volume2 className="w-5 h-5 text-orange-500 fill-current animate-bounce-slow" />
                      <span>Bấm nghe phát âm</span>
                    </button>
                  )}

                  {/* ── Multiple Choice options ── */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      {options.map((opt, idx) => {
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
                            style={{
                              borderBottomColor
                            }}
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

                  {/* ── Fill in the blank / Listening text input ── */}
                  {(q.type === 'fill_in_blank' || q.type === 'listening') && (
                    <div className="space-y-4">
                      <div className="relative">
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
                          className={`w-full rounded-2xl border-2 py-4 px-5 text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none font-bold text-sm transition-all placeholder:text-[var(--color-text-muted)] ${
                            !isAnswered
                              ? 'border-[var(--color-surface-border)] focus:border-[var(--color-primary)]'
                              : typedAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()
                                ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900'
                                : 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
                          }`}
                        />
                        {!isAnswered && typedAnswer.trim() && (
                          <button
                            onClick={() => handleAnswer(typedAnswer.trim())}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 btn-3d-primary py-1.5 px-3 text-xs select-none"
                          >
                            Kiểm tra
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* ── Duolingo-style bottom slide-up banner ── */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ y: 150, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 150, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className={`fixed bottom-0 left-0 right-0 z-50 py-5 px-6 border-t-4 shadow-2xl flex items-center justify-between ${
                    isCorrectAnswer
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
                          <p className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-1 uppercase tracking-wider">+20 XP phản xạ nơ-ron</p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={nextQuestion}
                      className={`w-full md:w-auto select-none py-3 px-8 text-xs font-black rounded-2xl uppercase tracking-wider ${
                        isCorrectAnswer ? 'btn-3d-success' : 'btn-3d-danger'
                      }`}
                    >
                      {currentQ < questions.length - 1 ? 'Tiếp tục' : 'Xem kết quả'}
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
              total={questions.length}
              answers={answers}
              questions={questions}
              onRestart={fetchQuestions}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* ──═ DIALOG MODAL: AI SINH ĐỀ ══── */}
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
                  Gemini AI sẽ lập tức tạo ra bộ câu hỏi trắc nghiệm và điền vào chỗ trống tiếng Anh theo chủ đề bạn chọn để kiểm tra phản xạ nơ-ron.
                </p>
              </div>

              {/* Preset list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 min-h-0 pb-2">
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Chủ đề gợi ý:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(themes.length > 0 ? themes.map(t => t.theme) : ['Cyberpunk', 'Sci-Fi', 'Tech', 'Security', 'Network', 'AI']).map((themeName) => {
                      const cfg = getThemeConfig(themeName);
                      const isSelected = selectedAITheme === themeName && !customAITheme;
                      return (
                        <button
                          key={themeName}
                          type="button"
                          onClick={() => {
                            setSelectedAITheme(themeName);
                            setCustomAITheme('');
                          }}
                          className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${isSelected
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                              : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                            }`}
                          style={{
                            borderColor: isSelected ? cfg.color : undefined,
                          }}
                        >
                          <span className="truncate w-full">{cfg.emoji} {themeName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Hoặc tự điền chủ đề theo ý muốn:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Job Interview, Travel, Business, Food..."
                    value={customAITheme}
                    onChange={(e) => setCustomAITheme(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all font-bold text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAIThemeModal(false)}
                  className="flex-1 btn-3d-secondary py-2.5"
                >
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
