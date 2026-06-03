import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, Database, Volume2,
  Sparkles, Trophy, Brain, RotateCcw, ChevronRight, Clock,
  Headphones, PenLine, ListChecks, Zap
} from 'lucide-react';
import { getRandomQuiz, submitQuiz } from '../services/quizService';
import { seedDatabase } from '../services/seedService';
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

/* ── Question type badge ─────────────────────────────────────────────────── */
const TYPE_META = {
  multiple_choice: { label: 'Trắc Nghiệm', icon: <ListChecks className="w-3.5 h-3.5" />, color: 'var(--color-primary)' },
  fill_in_blank:   { label: 'Điền Vào Chỗ Trống', icon: <PenLine className="w-3.5 h-3.5" />, color: 'var(--color-accent)' },
  listening:       { label: 'Nghe & Viết', icon: <Headphones className="w-3.5 h-3.5" />, color: 'var(--color-secondary)' },
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.multiple_choice;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-widest"
      style={{ color: meta.color, background: meta.color + '18', border: `1px solid ${meta.color}40` }}
    >
      {meta.icon} {meta.label}
    </span>
  );
};

/* ── Progress dots ───────────────────────────────────────────────────────── */
const ProgressDots = ({ total, current, answers }) => (
  <div className="flex gap-1.5 flex-wrap justify-center">
    {Array.from({ length: total }).map((_, i) => {
      const ans = answers[i];
      let bg = 'bg-white/10';
      if (i < current) bg = ans?.correct ? 'bg-green-500' : 'bg-[var(--color-secondary)]';
      else if (i === current) bg = 'bg-[var(--color-primary)] animate-pulse';
      return (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${bg} ${i === current ? 'w-6 h-3' : 'w-3 h-3'}`}
        />
      );
    })}
  </div>
);

/* ── Result screen ───────────────────────────────────────────────────────── */
const ResultScreen = ({ score, total, answers, questions, onRestart }) => {
  const pct = Math.round((score / total) * 100);
  const rank = pct >= 90 ? { label: 'Xuất Sắc', color: '#FFD700', icon: '🏆' }
    : pct >= 70 ? { label: 'Tốt', color: 'var(--color-primary)', icon: '⚡' }
    : pct >= 50 ? { label: 'Khá', color: 'var(--color-accent)', icon: '🎯' }
    : { label: 'Cần Cải Thiện', color: 'var(--color-secondary)', icon: '💡' };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Score ring */}
      <div className="glass-panel p-8 text-center">
        <p className="text-3xl mb-4">{rank.icon}</p>
        <h2 className="text-2xl font-black font-mono uppercase tracking-widest text-glow mb-6" style={{ color: rank.color }}>
          {rank.label}
        </h2>

        <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="transparent" stroke="#1a1a1a" strokeWidth="10" />
            <motion.circle
              cx="50" cy="50" r="42" fill="transparent"
              stroke={rank.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="264"
              initial={{ strokeDashoffset: 264 }}
              animate={{ strokeDashoffset: 264 - (264 * pct / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
          <div className="absolute text-center">
            <motion.p
              className="text-4xl font-black font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {pct}%
            </motion.p>
            <p className="text-[10px] text-gray-500 font-mono">{score}/{total} đúng</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Đúng', value: score, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
            { label: 'Sai', value: total - score, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
            { label: 'Tổng', value: total, color: 'text-white', bg: 'bg-white/5 border-white/10' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 font-mono uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={onRestart} className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 font-mono">
          <RotateCcw className="w-4 h-4" /> Chơi Lại
        </button>
      </div>

      {/* Answer breakdown */}
      <div className="glass-panel p-6">
        <h3 className="font-mono font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--color-accent)]" /> Chi Tiết Từng Câu
        </h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = answers[i];
            const correct = ans?.correct;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  correct ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                {correct
                  ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 font-mono line-clamp-2">{q.question}</p>
                  {!correct && q.correctAnswer && (
                    <p className="text-xs text-green-400 font-mono mt-1">
                      ✓ Đáp án: <strong>{q.correctAnswer}</strong>
                    </p>
                  )}
                  {!correct && q.type === 'multiple_choice' && (
                    <p className="text-xs text-green-400 font-mono mt-1">
                      ✓ Đáp án: <strong>{(Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'))[q.answerIndex]}</strong>
                    </p>
                  )}
                </div>
                <TypeBadge type={q.type} />
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
        setError('Ngân hàng câu hỏi trống. Hãy khởi tạo dữ liệu mẫu.');
      }
    } catch {
      setError('Không thể kết nối tới máy chủ dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, []);

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
      await fetchQuestions();
    } catch {
      toast.error('Lỗi khi khởi tạo dữ liệu mẫu.');
    } finally {
      setSeeding(false);
    }
  };

  /* ── Answer ── */
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
          toast.success(`+${result.earnedXp} XP! Điểm đã được lưu.`, { icon: '⚡' });
        } catch { /* silent */ }
      }
    }
  };

  /* ── Play audio ── */
  const playAudio = () => {
    const q = questions[currentQ];
    speak(q.correctAnswer || '', 0.75);
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
        <div className="absolute inset-0 rounded-full bg-[var(--color-primary)] blur-xl opacity-20 animate-pulse" />
      </div>
      <span className="font-mono text-[var(--color-primary)] animate-pulse text-sm">Đang tải câu hỏi...</span>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-6">
      <Brain className="w-16 h-16 text-[var(--color-secondary)] opacity-40 mx-auto" />
      <p className="text-[var(--color-secondary)] font-mono">{error}</p>
      {error.includes('trống') && (
        <button onClick={handleSeed} disabled={seeding} className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 font-mono text-sm">
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
  const timerColor = timeLeft <= 5 ? 'var(--color-secondary)' : timeLeft <= 10 ? '#f59e0b' : 'var(--color-primary)';

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-2xl mx-auto pb-12"
    >
      {/* ── Header ── */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-black font-mono uppercase tracking-widest text-glow mb-1 text-[var(--color-accent)]">
          Bài Kiểm Tra Nơ-ron
        </h1>
        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Kiểm Tra Phản Xạ Nhận Thức</p>
      </header>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ── Top meta bar ── */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <ProgressDots total={questions.length} current={currentQ} answers={answers} />
              <div className="flex items-center gap-3 shrink-0">
                {/* Live score */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span className="font-mono font-bold text-sm text-white">{score}</span>
                  <span className="text-gray-500 font-mono text-xs">/{currentQ + (isAnswered ? 1 : 0)}</span>
                </div>
                {/* Timer */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono font-bold text-sm transition-all"
                  style={{
                    color: timerColor,
                    borderColor: timerColor + '50',
                    background: timerColor + '10',
                  }}
                >
                  <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'animate-pulse' : ''}`} />
                  {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* ── Question card ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="glass-panel relative overflow-hidden"
              >
                {/* Timer progress bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: timerColor }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>

                <div className="p-6 pt-7">
                  {/* Question number + type */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                      Câu {currentQ + 1} / {questions.length}
                    </span>
                    <TypeBadge type={q.type} />
                  </div>

                  {/* Question text */}
                  <h2 className="text-xl font-bold leading-relaxed mb-5 text-white">{q.question}</h2>

                  {/* Audio button for listening */}
                  {(q.type === 'listening' || q.isAudio) && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={playAudio}
                      className="w-full mb-5 py-4 rounded-xl border-2 border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/8 flex items-center justify-center gap-3 font-mono text-sm text-[var(--color-secondary)] hover:border-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/15 transition-all group"
                    >
                      <div className="relative">
                        <Volume2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="absolute -inset-2 rounded-full bg-[var(--color-secondary)] blur-md opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>
                      <span>Phát Âm Thanh</span>
                      <div className="flex gap-0.5 items-end h-4">
                        {[3, 5, 3, 7, 4, 6, 3].map((h, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-[var(--color-secondary)] rounded-full"
                            animate={{ height: [h, h * 2, h] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                            style={{ height: h }}
                          />
                        ))}
                      </div>
                    </motion.button>
                  )}

                  {/* ── Multiple choice options ── */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      {options.map((opt, idx) => {
                        let border = 'border-white/10 hover:border-[var(--color-primary)]/50 hover:bg-white/5';
                        let bg = '';
                        let textColor = 'text-gray-200';
                        let icon = null;

                        if (isAnswered) {
                          if (idx === q.answerIndex) {
                            border = 'border-green-500';
                            bg = 'bg-green-500/10';
                            textColor = 'text-green-300';
                            icon = <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
                          } else if (idx === selectedOption) {
                            border = 'border-red-500';
                            bg = 'bg-red-500/10';
                            textColor = 'text-red-300';
                            icon = <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
                          } else {
                            border = 'border-white/5';
                            textColor = 'text-gray-600';
                          }
                        }

                        return (
                          <motion.button
                            key={idx}
                            whileHover={!isAnswered ? { scale: 1.01 } : {}}
                            whileTap={!isAnswered ? { scale: 0.99 } : {}}
                            onClick={() => !isAnswered && handleAnswer(idx)}
                            disabled={isAnswered}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 font-mono text-sm flex items-center gap-3 ${border} ${bg} ${textColor}`}
                          >
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border"
                              style={{
                                background: isAnswered && idx === q.answerIndex ? 'rgba(34,197,94,0.2)'
                                  : isAnswered && idx === selectedOption ? 'rgba(239,68,68,0.2)'
                                  : 'rgba(255,255,255,0.05)',
                                borderColor: isAnswered && idx === q.answerIndex ? 'rgba(34,197,94,0.5)'
                                  : isAnswered && idx === selectedOption ? 'rgba(239,68,68,0.5)'
                                  : 'rgba(255,255,255,0.1)',
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

                  {/* ── Fill in blank / Listening input ── */}
                  {(q.type === 'fill_in_blank' || q.type === 'listening') && (
                    <div className="space-y-3">
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
                          placeholder="Nhập đáp án rồi nhấn Enter..."
                          className={`w-full rounded-xl border-2 py-4 px-5 text-white bg-black/50 focus:outline-none font-mono text-sm transition-all placeholder:text-gray-600 ${
                            !isAnswered
                              ? 'border-white/10 focus:border-[var(--color-primary)]'
                              : typedAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()
                                ? 'border-green-500 bg-green-500/10 text-green-300'
                                : 'border-red-500 bg-red-500/10 text-red-300'
                          }`}
                        />
                        {!isAnswered && typedAnswer.trim() && (
                          <button
                            onClick={() => handleAnswer(typedAnswer.trim())}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-black px-3 py-1.5 rounded-lg text-xs font-mono font-bold hover:bg-white transition-colors"
                          >
                            Xác Nhận
                          </button>
                        )}
                      </div>

                      {/* Answer reveal */}
                      {isAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border flex items-center gap-3 ${
                            typedAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()
                              ? 'border-green-500/40 bg-green-500/8'
                              : 'border-red-500/40 bg-red-500/8'
                          }`}
                        >
                          {typedAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim()
                            ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            : <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                          }
                          <div>
                            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Đáp án đúng</p>
                            <p className="text-green-400 font-bold font-mono text-lg">{q.correctAnswer}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Feedback footer + Next button ── */}
                <AnimatePresence>
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 pb-6 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {answers[answers.length - 1]?.correct
                          ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-green-400 font-mono text-sm font-bold">+20 XP Chính Xác!</span></>
                          : <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-mono text-sm">Sai rồi!</span></>
                        }
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={nextQuestion}
                        className="btn-secondary flex items-center gap-2 px-5 py-2.5 font-mono text-sm"
                      >
                        {currentQ < questions.length - 1 ? 'Câu Tiếp' : 'Xem Kết Quả'}
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
    </motion.div>
  );
};

export default Quiz;
