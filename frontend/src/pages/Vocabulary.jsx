import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ChevronRight, ChevronLeft, Search, Loader2,
  Heart, Database, Sparkles, Grid3X3, Layers, X, BookOpen,
  GraduationCap, ArrowLeft, CheckCircle, Target, Zap, Trophy,
  RotateCcw, Eye, EyeOff, Filter, Plus
} from 'lucide-react';
import { getVocabulary, getThemes, toggleFavoriteWord, createVocabulary, getFavoriteVocabulary } from '../services/vocabularyService';
import { seedDatabase, generateAIWords } from '../services/seedService';
import { pageVariants } from '../animations/variants';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/* ── Speak ──────────────────────────────────────────────────────────────── */
const speak = (text, rate = 0.85) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

/* ── Theme config ─────────────────────────────────────────────────────── */
const THEME_CONFIG = {
  AI:       { color: '#a855f7', bg: '#a855f722', emoji: '🤖' },
  Cyber:    { color: '#00f0ff', bg: '#00f0ff22', emoji: '🌐' },
  Tech:     { color: '#3b82f6', bg: '#3b82f622', emoji: '⚙️' },
  Security: { color: '#ef4444', bg: '#ef444422', emoji: '🛡️' },
  Network:  { color: '#22c55e', bg: '#22c55e22', emoji: '📡' },
  'Sci-Fi': { color: '#f59e0b', bg: '#f59e0b22', emoji: '🚀' },
  Data:     { color: '#06b6d4', bg: '#06b6d422', emoji: '💾' },
  Hack:     { color: '#f97316', bg: '#f9731622', emoji: '💻' },
  General:  { color: '#8b5cf6', bg: '#8b5cf622', emoji: '📚' },
};
const getThemeConfig = (t) => {
  if (t === '__favorites__') return { color: '#ef4444', bg: '#ef444422', emoji: '❤️' };
  return THEME_CONFIG[t] || { color: '#6b7280', bg: '#6b728022', emoji: '📝' };
};

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY SESSION — học theo chủ đề với chế độ flashcard + quiz nhỏ
═══════════════════════════════════════════════════════════════════════════ */
const StudySession = ({ theme, themeColor, onExit }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('study'); // 'study' | 'quiz'
  const [learned, setLearned] = useState(new Set());
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  /* Load all words for this theme */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        let loadedWords = [];
        if (theme === '__favorites__') {
          loadedWords = await getFavoriteVocabulary();
        } else {
          const data = await getVocabulary(1, 100, theme);
          loadedWords = data.words || [];
        }
        setWords(loadedWords);
      } catch {
        toast.error('Không thể tải từ vựng cho chủ đề này.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [theme]);

  /* Build quiz questions from words */
  const quizQuestions = useMemo(() => {
    if (words.length < 2) return [];
    return words.map((w) => {
      // pick 3 wrong options
      const wrong = words
        .filter((x) => x.id !== w.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((x) => x.meaning);
      const options = [...wrong, w.meaning].sort(() => Math.random() - 0.5);
      return {
        word: w.word,
        ipa: w.ipa,
        correctMeaning: w.meaning,
        options,
        answerIdx: options.indexOf(w.meaning),
      };
    });
  }, [words]);

  /* Study navigation */
  const markLearned = () => {
    setLearned((prev) => new Set([...prev, words[currentIdx].id]));
    if (currentIdx < words.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIdx((i) => i + 1), 150);
    }
  };

  const goNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, words.length - 1)), 150);
  };
  const goPrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.max(i - 1, 0)), 150);
  };

  /* Start quiz */
  const startQuiz = () => {
    setMode('quiz');
    setQuizIdx(0);
    setScore(0);
    setQuizDone(false);
    setQuizAnswered(false);
    setQuizCorrect(false);
    setQuizQuestion(quizQuestions[0] || null);
  };

  /* Quiz answer */
  const answerQuiz = (idx) => {
    if (quizAnswered) return;
    const correct = idx === quizQuestion.answerIdx;
    setQuizCorrect(correct);
    setQuizAnswered(true);
    if (correct) setScore((s) => s + 1);
  };

  const nextQuiz = () => {
    const next = quizIdx + 1;
    if (next >= quizQuestions.length) {
      setQuizDone(true);
    } else {
      setQuizIdx(next);
      setQuizQuestion(quizQuestions[next]);
      setQuizAnswered(false);
      setQuizCorrect(false);
    }
  };

  const cfg = getThemeConfig(theme);
  const progress = words.length ? Math.round((learned.size / words.length) * 100) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
      <p className="font-mono text-sm" style={{ color: themeColor }}>Đang tải từ vựng {theme}...</p>
    </div>
  );

  if (words.length === 0) return (
    <div className="text-center py-20">
      <p className="text-gray-500 font-mono">Chủ đề này chưa có từ vựng nào.</p>
      <button onClick={onExit} className="mt-6 btn-secondary flex items-center gap-2 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>
    </div>
  );

  const currentWord = words[currentIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-5"
    >
      {/* ── Session header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={onExit}
          className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{cfg.emoji}</span>
            <h2 className="text-xl font-black font-mono uppercase tracking-widest" style={{ color: themeColor }}>
              Chủ Đề: {theme}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: themeColor }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400 shrink-0">
              {learned.size}/{words.length} đã học
            </span>
          </div>
        </div>
        {/* Mode tabs */}
        <div className="flex gap-1 bg-black/50 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setMode('study')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              mode === 'study' ? 'text-black font-bold' : 'text-gray-500 hover:text-white'
            }`}
            style={mode === 'study' ? { background: themeColor } : {}}
          >
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Học</span>
          </button>
          <button
            onClick={startQuiz}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              mode === 'quiz' ? 'text-black font-bold' : 'text-gray-500 hover:text-white'
            }`}
            style={mode === 'quiz' ? { background: themeColor } : {}}
          >
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Kiểm tra</span>
          </button>
        </div>
      </div>

      {/* ═══ STUDY MODE ══════════════════════════════════════════════════ */}
      {mode === 'study' && (
        <div className="space-y-4">
          {/* Flashcard */}
          <div
            className="w-full rounded-2xl border-2 overflow-hidden relative cursor-pointer select-none"
            style={{
              minHeight: '320px',
              borderColor: themeColor + '50',
              background: 'rgba(0,0,0,0.85)',
              boxShadow: `0 0 40px ${themeColor}18`,
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Bg image */}
            {currentWord.imageUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-10"
                style={{ backgroundImage: `url(${currentWord.imageUrl})`, filter: 'grayscale(50%) sepia(80%) hue-rotate(160deg)' }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

            <AnimatePresence mode="wait">
              {!isFlipped ? (
                /* Front */
                <motion.div
                  key="front"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 flex flex-col items-center justify-center p-8 min-h-[320px] text-center"
                >
                  <span
                    className="text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4"
                    style={{ background: cfg.bg, color: themeColor, border: `1px solid ${themeColor}40` }}
                  >
                    {currentWord.type}
                  </span>
                  <h2 className="text-5xl font-black text-white mb-3 tracking-wider">{currentWord.word}</h2>
                  <p className="text-xl font-mono mb-5" style={{ color: themeColor }}>{currentWord.ipa}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                    className="p-3 rounded-full border transition-all hover:scale-110"
                    style={{ borderColor: themeColor + '40', color: themeColor, background: themeColor + '10' }}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <p className="absolute bottom-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                    Nhấn để xem nghĩa →
                  </p>

                  {/* Learned badge */}
                  {learned.has(currentWord.id) && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-1 rounded-lg text-xs font-mono">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã học
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Back */
                <motion.div
                  key="back"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 flex flex-col items-center justify-center p-8 min-h-[320px] text-center gap-4"
                >
                  <p className="text-3xl font-bold text-white leading-relaxed">{currentWord.meaning}</p>
                  <div className="w-16 h-px" style={{ background: themeColor }} />
                  <p className="text-gray-400 italic text-sm">"{currentWord.example}"</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(currentWord.example, 0.8); }}
                    className="flex items-center gap-2 text-xs font-mono border px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ color: themeColor, borderColor: themeColor + '40' }}
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Nghe ví dụ
                  </button>
                  <p className="absolute bottom-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                    ← Nhấn để quay lại
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="p-3 rounded-xl border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/30 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 flex flex-col items-center gap-2">
              {/* Dot progress */}
              <div className="flex gap-1 flex-wrap justify-center max-w-xs">
                {words.map((w, i) => (
                  <div
                    key={w.id}
                    onClick={() => { setIsFlipped(false); setCurrentIdx(i); }}
                    className="w-2.5 h-2.5 rounded-full cursor-pointer transition-all"
                    style={{
                      background: learned.has(w.id) ? '#22c55e'
                        : i === currentIdx ? themeColor : 'rgba(255,255,255,0.15)',
                      transform: i === currentIdx ? 'scale(1.4)' : 'scale(1)',
                      boxShadow: i === currentIdx ? `0 0 6px ${themeColor}` : 'none',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 font-mono">{currentIdx + 1} / {words.length}</p>
            </div>

            <button
              onClick={goNext}
              disabled={currentIdx === words.length - 1}
              className="p-3 rounded-xl border border-white/10 text-gray-400 disabled:opacity-30 hover:border-white/30 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={markLearned}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold border-2 transition-all flex items-center justify-center gap-2"
              style={{
                borderColor: learned.has(currentWord?.id) ? '#22c55e' : themeColor,
                background: learned.has(currentWord?.id) ? '#22c55e15' : themeColor + '15',
                color: learned.has(currentWord?.id) ? '#22c55e' : themeColor,
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {learned.has(currentWord?.id) ? 'Đã đánh dấu học' : 'Đánh dấu đã học'}
            </button>
            {learned.size === words.length && (
              <button
                onClick={startQuiz}
                className="flex-1 py-3 rounded-xl font-mono text-sm font-bold border-2 text-black transition-all flex items-center justify-center gap-2 animate-pulse"
                style={{ background: themeColor, borderColor: themeColor }}
              >
                <Target className="w-4 h-4" /> Kiểm tra ngay!
              </button>
            )}
          </div>

          {/* Word list mini */}
          <div className="glass-panel p-4 space-y-2">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
              Tất cả từ trong chủ đề ({words.length})
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {words.map((w, i) => (
                <button
                  key={w.id}
                  onClick={() => { setIsFlipped(false); setCurrentIdx(i); }}
                  className={`text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                    i === currentIdx
                      ? 'border-transparent text-black font-bold'
                      : 'border-white/8 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                  style={i === currentIdx ? { background: themeColor } : {}}
                >
                  {learned.has(w.id) && <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />}
                  <span className="truncate">{w.word}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUIZ MODE ══════════════════════════════════════════════════ */}
      {mode === 'quiz' && (
        <div>
          {quizDone ? (
            /* Quiz result */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 text-center space-y-5"
            >
              <div className="text-5xl mb-2">
                {score / quizQuestions.length >= 0.8 ? '🏆' : score / quizQuestions.length >= 0.5 ? '⚡' : '💡'}
              </div>
              <h3 className="text-2xl font-black font-mono uppercase" style={{ color: themeColor }}>
                Kết Quả Kiểm Tra
              </h3>
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1a1a1a" strokeWidth="10" />
                  <motion.circle
                    cx="50" cy="50" r="40" fill="transparent"
                    stroke={themeColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray="251"
                    initial={{ strokeDashoffset: 251 }}
                    animate={{ strokeDashoffset: 251 - (251 * score / quizQuestions.length) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-black font-mono text-white">{Math.round(score / quizQuestions.length * 100)}%</p>
                  <p className="text-[10px] text-gray-500 font-mono">{score}/{quizQuestions.length}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={startQuiz} className="btn-secondary flex items-center gap-2 font-mono text-sm">
                  <RotateCcw className="w-4 h-4" /> Làm lại
                </button>
                <button onClick={() => setMode('study')} className="btn-primary flex items-center gap-2 font-mono text-sm px-5">
                  <Layers className="w-4 h-4" /> Học tiếp
                </button>
              </div>
            </motion.div>
          ) : quizQuestion ? (
            /* Quiz question */
            <motion.div
              key={quizIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel p-6 space-y-5"
            >
              {/* Progress */}
              <div className="flex justify-between items-center text-xs font-mono text-gray-500">
                <span>Câu {quizIdx + 1} / {quizQuestions.length}</span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  {score} đúng
                </span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(quizIdx / quizQuestions.length) * 100}%`, background: themeColor }}
                />
              </div>

              {/* Question */}
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-2">Chọn nghĩa đúng của từ</p>
                <h3 className="text-4xl font-black text-white">{quizQuestion.word}</h3>
                <p className="font-mono mt-1" style={{ color: themeColor }}>{quizQuestion.ipa}</p>
                <button
                  onClick={() => speak(quizQuestion.word)}
                  className="mt-2 p-2 rounded-full border transition-all hover:scale-110 inline-flex"
                  style={{ borderColor: themeColor + '40', color: themeColor }}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {quizQuestion.options.map((opt, idx) => {
                  let style = 'border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5';
                  if (quizAnswered) {
                    if (idx === quizQuestion.answerIdx) style = 'border-green-500 bg-green-500/15 text-green-300';
                    else style = 'border-white/5 text-gray-600 opacity-60';
                  }
                  return (
                    <motion.button
                      key={idx}
                      whileHover={!quizAnswered ? { scale: 1.01 } : {}}
                      onClick={() => answerQuiz(idx)}
                      disabled={quizAnswered}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-mono transition-all flex items-center gap-3 ${style}`}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border"
                        style={{
                          background: idx === quizQuestion.answerIdx && quizAnswered ? '#22c55e30' : 'rgba(255,255,255,0.05)',
                          borderColor: idx === quizQuestion.answerIdx && quizAnswered ? '#22c55e' : 'rgba(255,255,255,0.1)',
                          color: idx === quizQuestion.answerIdx && quizAnswered ? '#22c55e' : undefined,
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {quizAnswered && idx === quizQuestion.answerIdx && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>

              {quizAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-between items-center pt-1"
                >
                  <p className={`text-sm font-mono font-bold ${quizCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {quizCorrect ? '✓ Chính xác! +10 điểm' : '✗ Sai rồi!'}
                  </p>
                  <button
                    onClick={nextQuiz}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm text-black font-bold transition-all hover:opacity-90"
                    style={{ background: themeColor }}
                  >
                    {quizIdx + 1 < quizQuestions.length ? 'Tiếp' : 'Xem kết quả'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-8 text-center space-y-4"
            >
              <Target className="w-12 h-12 text-gray-500 mx-auto opacity-50" />
              <h3 className="text-lg font-mono font-bold text-white uppercase tracking-wider" style={{ color: themeColor }}>
                Không Thể Tạo Bài Kiểm Tra
              </h3>
              <p className="text-xs text-gray-400 font-mono leading-relaxed max-w-sm mx-auto">
                Chủ đề này hiện chỉ có {words.length} từ vựng. Bạn cần thêm ít nhất 2 từ vựng để hệ thống có thể tạo câu hỏi trắc nghiệm.
              </p>
              <button
                onClick={() => setMode('study')}
                className="btn-secondary px-5 py-2 font-mono text-xs mx-auto flex items-center gap-2 mt-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" /> Quay lại chế độ Học
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   THEME SELECTOR — màn hình chọn chủ đề
═══════════════════════════════════════════════════════════════════════════ */
const ThemeSelector = ({ themes, onSelectTheme, totalWords }) => {
  if (themes.length === 0) return (
    <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-surface-border)]">
      <p className="text-[var(--color-text-muted)] font-medium">Chưa có chủ đề nào. Hãy sinh từ vựng trước.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
      {themes.map(({ theme, count }, i) => {
        const cfg = getThemeConfig(theme);
        return (
          <motion.button
            key={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, shadow: 'md' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectTheme(theme, cfg.color)}
            className="glass-panel p-6 text-left rounded-2xl border border-[var(--color-surface-border)] hover:border-[var(--color-primary)]/50 transition-all duration-300 group relative overflow-hidden bg-[var(--color-surface)]"
          >
            {/* Soft background glow */}
            <div
              className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl pointer-events-none"
              style={{ background: cfg.color }}
            />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-sm transition-transform duration-300 group-hover:scale-110" style={{ background: `${cfg.color}15` }}>
                {cfg.emoji}
              </div>
              <h3 className="font-bold text-lg mb-1 text-[var(--color-text)] transition-colors">
                {theme}
              </h3>
              <p className="text-[var(--color-text-muted)] text-xs font-medium mb-4">{count} từ vựng</p>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.color, width: `${Math.min(100, (count / Math.max(totalWords, 1)) * 400)}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (count / Math.max(totalWords, 1)) * 400)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                />
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: cfg.color }}>
                <GraduationCap className="w-4 h-4" />
                <span>Bắt đầu học</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN VOCABULARY PAGE
═══════════════════════════════════════════════════════════════════════════ */
const Vocabulary = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('browse'); // 'browse' | 'theme'
  const [words, setWords] = useState([]);
  const [themes, setThemes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('');
  const [viewMode, setViewMode] = useState('flashcard');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [studyTheme, setStudyTheme] = useState(null);
  const [studyThemeColor, setStudyThemeColor] = useState('#00f0ff');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWordData, setNewWordData] = useState({
    word: '',
    ipa: '',
    meaning: '',
    type: 'noun',
    example: '',
    theme: 'General',
    imageUrl: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [searchingAPI, setSearchingAPI] = useState(false);
  const [imageSourceType, setImageSourceType] = useState('upload'); // 'upload' | 'url'
  const [favoriteWordsList, setFavoriteWordsList] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [showAIThemeModal, setShowAIThemeModal] = useState(false);
  const [selectedAITheme, setSelectedAITheme] = useState('Cyberpunk');
  const [customAITheme, setCustomAITheme] = useState('');

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp ảnh hợp lệ!');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Dung lượng ảnh phải nhỏ hơn 4MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewWordData((prev) => ({ ...prev, imageUrl: event.target.result }));
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc tệp ảnh.');
    };
    reader.readAsDataURL(file);
  };

  const fetchFavoriteWords = useCallback(async () => {
    if (!user) return;
    setLoadingFavorites(true);
    try {
      const data = await getFavoriteVocabulary();
      setFavoriteWordsList(data);
    } catch {
      toast.error('Không thể tải từ vựng yêu thích.');
    } finally {
      setLoadingFavorites(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'favorites') {
      fetchFavoriteWords();
    }
  }, [tab, favorites, fetchFavoriteWords]);

  useEffect(() => {
    if (user?.favoriteWords) setFavorites(user.favoriteWords);
  }, [user]);

  const fetchWords = useCallback(async (pageNum, append = false, filterTheme = '', filterSearch = '') => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const data = await getVocabulary(pageNum, 20, filterTheme, filterSearch);
      if (data?.words) {
        setWords((prev) => append ? [...prev, ...data.words] : data.words);
        setHasMore(data.hasMore);
        if (!append) setCurrentIndex(0);
        setError(null);
      }
    } catch {
      setError('Không thể kết nối tới máy chủ.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchThemes = useCallback(async () => {
    try {
      const data = await getThemes();
      setThemes(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setPage(1);
    const delayDebounce = setTimeout(() => {
      fetchWords(1, false, selectedThemeFilter, searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [selectedThemeFilter, searchTerm, fetchWords]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const data = await seedDatabase();
      toast.success(data.message || 'Khởi tạo dữ liệu thành công!');
      setError(null);
      await Promise.all([fetchWords(1, false, selectedThemeFilter, searchTerm), fetchThemes()]);
    } catch { toast.error('Lỗi khi khởi tạo dữ liệu.'); }
    finally { setSeeding(false); }
  };

  const handleAIGenerate = async (theme = 'Cyberpunk') => {
    setAiLoading(true);
    const id = toast.loading(`Nexus AI đang sinh từ vựng về chủ đề "${theme}"...`);
    try {
      const data = await generateAIWords(theme);
      toast.success(data.message || 'AI sinh từ vựng thành công!', { id });
      await Promise.all([fetchWords(1, false, selectedThemeFilter, searchTerm), fetchThemes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể liên kết Nexus AI.', { id });
    } finally { setAiLoading(false); }
  };

  const handleLookUp = async () => {
    const w = newWordData.word.trim();
    if (!w) {
      toast.error('Vui lòng nhập từ vựng tiếng Anh trước!');
      return;
    }

    setSearchingAPI(true);
    const toastId = toast.loading('Đang tra cứu từ điển và dịch nghĩa...');
    
    const dictionaryPromise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data[0];
      });

    const translationPromise = fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|vi`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data?.responseData?.translatedText || '';
      });

    try {
      const [dictResult, transResult] = await Promise.allSettled([
        dictionaryPromise,
        translationPromise
      ]);

      let ipaStr = '';
      let typeStr = 'noun';
      let exampleStr = '';
      let meaningStr = '';

      if (dictResult.status === 'fulfilled' && dictResult.value) {
        const entry = dictResult.value;
        // 1. Extract IPA
        if (entry.phonetic) {
          ipaStr = entry.phonetic;
        } else if (entry.phonetics && entry.phonetics.length > 0) {
          const withText = entry.phonetics.find(p => p.text);
          if (withText) ipaStr = withText.text;
        }

        // 2. Extract Type
        if (entry.meanings && entry.meanings.length > 0) {
          const firstMeaning = entry.meanings[0];
          const pos = firstMeaning.partOfSpeech.toLowerCase();
          if (pos.includes('noun')) typeStr = 'noun';
          else if (pos.includes('verb')) typeStr = 'verb';
          else if (pos.includes('adjective')) typeStr = 'adj';
          else if (pos.includes('adverb')) typeStr = 'adv';
        }

        // 3. Extract Example
        if (entry.meanings && entry.meanings.length > 0) {
          for (const m of entry.meanings) {
            if (m.definitions && m.definitions.length > 0) {
              const defWithEx = m.definitions.find(d => d.example);
              if (defWithEx) {
                exampleStr = defWithEx.example;
                break;
              }
            }
          }
        }
      }

      if (transResult.status === 'fulfilled' && transResult.value) {
        meaningStr = transResult.value;
        if (meaningStr) {
          meaningStr = meaningStr.charAt(0).toUpperCase() + meaningStr.slice(1);
        }
      }

      if (!ipaStr && !exampleStr && !meaningStr) {
        throw new Error('Không tìm thấy dữ liệu tra cứu.');
      }

      setNewWordData((prev) => ({
        ...prev,
        ipa: ipaStr || prev.ipa,
        type: typeStr || prev.type,
        example: exampleStr || prev.example,
        meaning: meaningStr || prev.meaning
      }));

      toast.success('Tra cứu và dịch nghĩa thành công!', { id: toastId });
    } catch (err) {
      toast.error('Không tìm thấy từ vựng hoặc xảy ra lỗi kết nối từ điển.', { id: toastId });
    } finally {
      setSearchingAPI(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Bạn cần đăng nhập để thực hiện!');
    setFormSubmitting(true);
    try {
      const data = await createVocabulary(newWordData);
      toast.success(data.message || 'Thêm từ vựng mới thành công!');
      setShowAddForm(false);
      // Reset form
      setNewWordData({
        word: '',
        ipa: '',
        meaning: '',
        type: 'noun',
        example: '',
        theme: 'General',
        imageUrl: ''
      });
      // Refresh list and themes
      await Promise.all([fetchWords(1, false, selectedThemeFilter, searchTerm), fetchThemes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thêm từ vựng.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleFav = async (wordId) => {
    if (!user) return toast.error('Bạn cần đăng nhập để lưu từ vựng!');
    try {
      const data = await toggleFavoriteWord(wordId);
      setFavorites(data.favoriteWords);
      toast.success(data.favoriteWords.includes(wordId) ? '❤️ Thêm yêu thích!' : '💔 Đã xóa');
    } catch { toast.error('Có lỗi xảy ra.'); }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    await fetchWords(next, true, selectedThemeFilter, searchTerm);
  };

  /* Browse tab: filtered words (fetched from backend) */
  const filteredWords = words;

  const allThemes = useMemo(() => themes.map(t => t.theme).filter(Boolean).sort(), [themes]);

  const goTo = (idx) => { setIsFlipped(false); setTimeout(() => setCurrentIndex(idx), 150); };

  const totalWords = themes.reduce((s, t) => s + t.count, 0);

  /* ── If in study session ── */
  if (studyTheme) {
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-7xl mx-auto">
        <StudySession
          theme={studyTheme}
          themeColor={studyThemeColor}
          onExit={() => { setStudyTheme(null); fetchThemes(); }}
        />
      </motion.div>
    );
  }

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
      <span className="font-mono text-[var(--color-primary)] animate-pulse text-sm">Đang giải mã dữ liệu...</span>
    </div>
  );

  if (error) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 text-center">
      <BookOpen className="w-16 h-16 text-[var(--color-secondary)] opacity-50 mx-auto" />
      <p className="text-[var(--color-secondary)] font-mono">{error}</p>
      <div className="flex gap-3">
        <button onClick={handleSeed} disabled={seeding} className="btn-primary flex items-center gap-2 px-5 py-2.5 font-mono text-sm">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Khởi tạo mẫu
        </button>
        <button
          onClick={() => {
            if (!user) return toast.error('Bạn cần đăng nhập để sinh từ vựng!');
            setSelectedAITheme('Cyberpunk');
            setCustomAITheme('');
            setShowAIThemeModal(true);
          }}
          disabled={aiLoading}
          className="btn-secondary flex items-center gap-2 px-5 py-2.5 font-mono text-sm cursor-pointer"
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Sinh Từ Mới
        </button>
      </div>
    </div>
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-black font-mono uppercase tracking-widest text-glow text-[var(--color-primary)] mb-1">
              Cơ Sở Dữ Liệu Từ Vựng
            </h1>
            <p className="text-gray-500 font-mono text-xs">{totalWords} từ · {themes.length} chủ đề</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (!user) return toast.error('Bạn cần đăng nhập để thêm từ vựng!');
                setShowAddForm(true);
              }}
              className="btn-secondary flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider border border-white/10 hover:border-[var(--color-primary)] transition-all"
              style={{ boxShadow: '0 0 10px rgba(0,240,255,0.05)' }}
            >
              <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Thêm Từ
            </button>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn-secondary flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider border border-white/10 hover:border-[var(--color-primary)] transition-all"
              style={{ boxShadow: '0 0 10px rgba(0,240,255,0.05)' }}
            >
              {seeding
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang Reset...</>
                : <><Database className="w-4 h-4 text-[var(--color-primary)]" /> Reset Mẫu</>
              }
            </button>
            <button
              onClick={() => {
                if (!user) return toast.error('Bạn cần đăng nhập để sinh từ vựng!');
                setSelectedAITheme('Cyberpunk');
                setCustomAITheme('');
                setShowAIThemeModal(true);
              }}
              disabled={aiLoading}
              className="btn-primary flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider cursor-pointer"
              style={{ borderColor: 'var(--color-accent)', boxShadow: '0 0 10px rgba(255,0,128,0.15)' }}
            >
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                : <><Sparkles className="w-4 h-4 text-[var(--color-accent)]" /> AI Sinh Từ Mới</>
              }
            </button>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex gap-1 bg-black/50 border border-white/10 p-1 rounded-xl w-fit">
          {[
            { key: 'browse', label: 'Duyệt Từ Vựng', icon: <BookOpen className="w-4 h-4" /> },
            { key: 'theme', label: 'Học Theo Chủ Đề', icon: <GraduationCap className="w-4 h-4" /> },
            { key: 'favorites', label: 'Từ Yêu Thích', icon: <Heart className="w-4 h-4" /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                tab === key
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ TAB: HỌC THEO CHỦ ĐỀ ════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {tab === 'theme' && (
          <motion.div key="theme" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-5 h-5 text-[var(--color-accent)]" />
                <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Chọn Chủ Đề Để Học</h2>
              </div>
              <p className="text-gray-500 font-mono text-xs">
                Chọn một chủ đề để bắt đầu phiên học flashcard + kiểm tra nhanh
              </p>
            </div>
            <ThemeSelector
              themes={themes}
              onSelectTheme={(theme, color) => { setStudyTheme(theme); setStudyThemeColor(color); }}
              totalWords={totalWords}
            />
          </motion.div>
        )}

        {/* ═══ TAB: DUYỆT TỪ VỰNG ══════════════════════════════════════ */}
        {tab === 'browse' && (
          <motion.div key="browse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Tìm từ hoặc nghĩa..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentIndex(0); }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]/50 font-mono transition-colors"
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); setCurrentIndex(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <button
                  onClick={() => { setSelectedThemeFilter(''); setCurrentIndex(0); }}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all uppercase tracking-wider ${
                    !selectedThemeFilter ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                >Tất cả</button>
                {allThemes.map((theme) => {
                  const cfg = getThemeConfig(theme);
                  return (
                    <button
                      key={theme}
                      onClick={() => { setSelectedThemeFilter(theme === selectedThemeFilter ? '' : theme); setCurrentIndex(0); }}
                      className="text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all uppercase tracking-wider"
                      style={{
                        background: selectedThemeFilter === theme ? cfg.color + '30' : 'transparent',
                        borderColor: selectedThemeFilter === theme ? cfg.color : 'rgba(255,255,255,0.1)',
                        color: selectedThemeFilter === theme ? cfg.color : '#6b7280',
                      }}
                    >{theme}</button>
                  );
                })}
              </div>
              <div className="flex gap-1 ml-auto">
                {[{ mode: 'flashcard', icon: <Layers className="w-4 h-4" /> }, { mode: 'grid', icon: <Grid3X3 className="w-4 h-4" /> }].map(({ mode, icon }) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg border transition-all ${viewMode === mode ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {totalWords === 0 ? (
              <div className="glass-panel p-8 text-center max-w-xl mx-auto border border-white/5 my-10 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
                <BookOpen className="w-12 h-12 text-[var(--color-primary)] opacity-40 mx-auto mb-4" />
                <h3 className="text-lg font-mono font-bold text-white mb-2 uppercase tracking-widest text-[var(--color-primary)]">Cơ sở dữ liệu trống</h3>
                <p className="text-xs text-gray-400 font-mono mb-6 leading-relaxed">
                  Kho từ vựng của bạn hiện chưa có dữ liệu. Bạn có thể tự thêm từ thủ công bằng nút "Thêm Từ" ở trên hoặc khởi tạo dữ liệu mẫu bên dưới.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="btn-secondary flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase border border-white/10 hover:border-[var(--color-primary)] transition-all"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Khởi tạo mẫu
                  </button>
                  <button
                    onClick={() => {
                      if (!user) return toast.error('Bạn cần đăng nhập để sinh từ vựng!');
                      setSelectedAITheme('Cyberpunk');
                      setCustomAITheme('');
                      setShowAIThemeModal(true);
                    }}
                    disabled={aiLoading}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase cursor-pointer"
                    style={{ borderColor: 'var(--color-accent)', boxShadow: '0 0 10px rgba(255,0,128,0.1)' }}
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Sinh Từ Mới
                  </button>
                </div>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-20 text-gray-500 font-mono border border-white/5 rounded-2xl bg-black/20">
                <p className="mb-2">Không tìm thấy từ nào phù hợp với bộ lọc.</p>
                <button
                  onClick={() => { setSelectedThemeFilter(''); setSearchTerm(''); }}
                  className="text-xs text-[var(--color-primary)] underline hover:text-white transition-colors"
                >
                  Xóa bộ lọc để quay lại
                </button>
              </div>
            ) : viewMode === 'flashcard' ? (
              /* ── Flashcard view ── */
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                {/* List */}
                <div className="glass-panel p-3 h-[520px] flex flex-col">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-2 mb-2">Danh sách ({filteredWords.length})</p>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
                    {filteredWords.map((w, i) => {
                      const cfg = getThemeConfig(w.theme);
                      return (
                        <button key={w.id} onClick={() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(i), 80); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${i === currentIndex ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40' : 'border border-transparent hover:bg-white/5'}`}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-mono font-bold text-sm truncate ${i === currentIndex ? 'text-[var(--color-primary)]' : 'text-white'}`}>{w.word}</p>
                            <p className="text-[10px] text-gray-500 truncate font-mono">{w.meaning}</p>
                          </div>
                          {favorites.includes(w.id) && <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />}
                        </button>
                      );
                    })}
                    {hasMore && (
                      <button onClick={loadMore} disabled={loadingMore}
                        className="w-full mt-2 py-2 text-xs font-mono text-gray-500 hover:text-[var(--color-primary)] border border-white/10 hover:border-[var(--color-primary)]/40 rounded-lg transition-all flex items-center justify-center gap-2">
                        {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : '+ Tải thêm'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Flashcard */}
                {filteredWords[currentIndex] && (() => {
                  const w = filteredWords[currentIndex];
                  const cfg = getThemeConfig(w.theme);
                  return (
                    <div className="flex flex-col gap-4 items-center">
                      <AnimatePresence mode="wait">
                        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="w-full max-w-lg">
                          <div
                            className="w-full rounded-2xl border-2 overflow-hidden relative cursor-pointer select-none"
                            style={{ minHeight: '280px', borderColor: cfg.color + '50', background: 'rgba(0,0,0,0.85)', boxShadow: `0 0 30px ${cfg.color}18` }}
                            onClick={() => setIsFlipped(!isFlipped)}
                          >
                            {w.imageUrl && <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url(${w.imageUrl})`, filter: 'grayscale(40%) sepia(80%) hue-rotate(160deg)' }} />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                            <AnimatePresence mode="wait">
                              {!isFlipped ? (
                                <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center p-8 min-h-[280px] text-center">
                                  <div className="flex gap-2 mb-3">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}50` }}>{w.theme}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">{w.type}</span>
                                  </div>
                                  <h2 className="text-5xl font-black text-white mb-2">{w.word}</h2>
                                  <p className="text-lg font-mono mb-4" style={{ color: cfg.color }}>{w.ipa}</p>
                                  <div className="flex gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); speak(w.word); }} className="p-3 rounded-full border transition-all hover:scale-110" style={{ borderColor: cfg.color + '40', color: cfg.color }}>
                                      <Volume2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleFav(w.id); }} className="p-3 rounded-full border border-white/10 hover:border-red-400 transition-all hover:scale-110">
                                      <Heart className={`w-5 h-5 ${favorites.includes(w.id) ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
                                    </button>
                                  </div>
                                  <p className="absolute bottom-3 text-[10px] text-gray-600 font-mono uppercase tracking-widest">Nhấn để xem nghĩa →</p>
                                </motion.div>
                              ) : (
                                <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center p-8 min-h-[280px] text-center gap-3">
                                  <h3 className="text-3xl font-bold text-white">{w.meaning}</h3>
                                  <div className="w-12 h-px" style={{ background: cfg.color }} />
                                  <p className="text-gray-400 italic text-sm">"{w.example}"</p>
                                  <button onClick={(e) => { e.stopPropagation(); speak(w.example, 0.8); }} className="flex items-center gap-2 text-xs font-mono border px-3 py-1.5 rounded-full" style={{ color: cfg.color, borderColor: cfg.color + '40' }}>
                                    <Volume2 className="w-3.5 h-3.5" /> Nghe ví dụ
                                  </button>
                                  <p className="absolute bottom-3 text-[10px] text-gray-600 font-mono">← Nhấn để quay lại</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                      {/* Nav */}
                      <div className="flex items-center gap-4 w-full max-w-lg justify-between">
                        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl border font-mono text-sm transition-all border-white/10 text-gray-500 disabled:opacity-30 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                          <ChevronLeft className="w-4 h-4" /> Trước
                        </button>
                        <p className="font-mono text-sm text-gray-400">{currentIndex + 1} / {filteredWords.length}</p>
                        <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === filteredWords.length - 1}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl border font-mono text-sm transition-all border-white/10 text-gray-500 disabled:opacity-30 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                          Tiếp <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ── Grid view ── */
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredWords.map((w, i) => {
                    const cfg = getThemeConfig(w.theme);
                    return (
                      <motion.div key={w.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 12) * 0.04 }}
                        className="glass-panel p-4 rounded-xl border border-white/8 hover:border-white/20 transition-all duration-200 group relative overflow-hidden"
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 20px ${cfg.color}15`}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${cfg.color}, transparent)` }} />
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>{w.theme}</span>
                          <button onClick={() => handleToggleFav(w.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart className={`w-4 h-4 ${favorites.includes(w.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                          </button>
                        </div>
                        <h3 className="text-xl font-black font-mono text-white mb-1">{w.word}</h3>
                        <p className="text-xs font-mono mb-2" style={{ color: cfg.color }}>{w.ipa}</p>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{w.meaning}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-600 font-mono border border-white/10 px-2 py-0.5 rounded">{w.type}</span>
                          <button onClick={() => speak(w.word)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: cfg.color }}>
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {hasMore && (
                  <div className="text-center mt-8">
                    <button onClick={loadMore} disabled={loadingMore} className="btn-secondary px-8 py-3 font-mono text-sm flex items-center gap-2 mx-auto">
                      {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} Tải thêm từ vựng
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'favorites' && (
          <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Từ Vựng Yêu Thích</h2>
                </div>
                <p className="text-gray-500 font-mono text-xs">
                  Danh sách những từ vựng bạn đã đánh dấu yêu thích để tập trung ôn luyện
                </p>
              </div>
              {user && favoriteWordsList.length > 1 && (
                <button
                  onClick={() => { setStudyTheme('__favorites__'); setStudyThemeColor('#ef4444'); }}
                  className="btn-primary flex items-center gap-2 px-5 py-2 font-mono text-xs uppercase tracking-wider animate-pulse"
                  style={{ borderColor: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.15)' }}
                >
                  <GraduationCap className="w-4 h-4 text-white" /> Bắt Đầu Ôn Tập ({favoriteWordsList.length})
                </button>
              )}
            </div>

            {!user ? (
              <div className="glass-panel p-10 text-center max-w-md mx-auto border border-white/5 my-10">
                <Heart className="w-12 h-12 text-red-500/40 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-mono font-bold text-white mb-2 uppercase">Yêu cầu đăng nhập</h3>
                <p className="text-xs text-gray-400 font-mono mb-6">
                  Vui lòng đăng nhập tài khoản của bạn để lưu và bắt đầu phiên ôn tập các từ vựng yêu thích.
                </p>
              </div>
            ) : loadingFavorites ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                <span className="font-mono text-xs text-gray-500">Đang quét kho thần kinh...</span>
              </div>
            ) : favoriteWordsList.length === 0 ? (
              <div className="glass-panel p-10 text-center max-w-lg mx-auto border border-white/5 my-10">
                <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-mono font-bold text-white mb-2 uppercase">Danh sách trống</h3>
                <p className="text-xs text-gray-400 font-mono">
                  Bạn chưa có từ vựng yêu thích nào. Hãy chuyển sang tab "Duyệt Từ Vựng" và click vào biểu tượng trái tim ❤️ ở các thẻ từ để thêm vào đây nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteWordsList.map((w) => {
                  const cfg = getThemeConfig(w.theme);
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-4 rounded-xl border border-white/8 hover:border-white/20 transition-all duration-200 group relative overflow-hidden"
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 20px ${cfg.color}15`}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${cfg.color}, transparent)` }} />
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                          {w.theme}
                        </span>
                        <button onClick={() => handleToggleFav(w.id)}>
                          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        </button>
                      </div>
                      <h3 className="text-xl font-black font-mono text-white mb-1">{w.word}</h3>
                      <p className="text-xs font-mono mb-2" style={{ color: cfg.color }}>{w.ipa}</p>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{w.meaning}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-mono border border-white/10 px-2 py-0.5 rounded">{w.type}</span>
                        <button onClick={() => speak(w.word)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: cfg.color }}>
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 border border-[var(--color-primary)]/30 shadow-[0_0_30px_rgba(0,240,255,0.15)]"
            >
              <button
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-6 h-6 text-[var(--color-primary)]" />
                <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-[var(--color-primary)]">
                  Thêm Từ Vựng Mới
                </h3>
              </div>
              
              <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-sm">
                <div>
                  <label className="block text-gray-400 mb-1">Từ vựng (Tiếng Anh) <span className="text-[var(--color-accent)]">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hacktivist"
                      value={newWordData.word}
                      onChange={(e) => setNewWordData({ ...newWordData, word: e.target.value })}
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                    <button
                      type="button"
                      disabled={searchingAPI}
                      onClick={handleLookUp}
                      className="btn-secondary px-4 py-2 text-xs font-mono border border-white/10 hover:border-[var(--color-primary)] transition-all rounded-lg flex items-center justify-center gap-1 shrink-0"
                    >
                      {searchingAPI ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Tra cứu...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Tra cứu
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">Phát âm IPA <span className="text-[var(--color-accent)]">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /ˈhæk.tɪ.vɪst/"
                      value={newWordData.ipa}
                      onChange={(e) => setNewWordData({ ...newWordData, ipa: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Loại từ <span className="text-[var(--color-accent)]">*</span></label>
                    <select
                      value={newWordData.type}
                      onChange={(e) => setNewWordData({ ...newWordData, type: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                    >
                      <option value="noun">Danh từ (noun)</option>
                      <option value="verb">Động từ (verb)</option>
                      <option value="adj">Tính từ (adj)</option>
                      <option value="adv">Trạng từ (adv)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Ý nghĩa (Tiếng Việt) <span className="text-[var(--color-accent)]">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nhà hoạt động hack, hacker chính trị"
                    value={newWordData.meaning}
                    onChange={(e) => setNewWordData({ ...newWordData, meaning: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Chủ đề (Theme)</label>
                  <input
                    type="text"
                    placeholder="e.g. Security, Tech, AI, Sci-Fi..."
                    value={newWordData.theme}
                    onChange={(e) => setNewWordData({ ...newWordData, theme: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Ví dụ minh họa (Tiếng Anh)</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. The hacktivist group leaked files to expose corruption."
                    value={newWordData.example}
                    onChange={(e) => setNewWordData({ ...newWordData, example: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5">Ảnh minh họa (Không bắt buộc)</label>
                  <div className="flex gap-2 mb-2 bg-black/40 border border-white/5 p-1 rounded-lg w-fit text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setImageSourceType('upload');
                        setNewWordData((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      className={`px-3 py-1 rounded transition-all ${
                        imageSourceType === 'upload'
                          ? 'bg-[var(--color-primary)] text-black font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Tải ảnh lên
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageSourceType('url');
                        setNewWordData((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      className={`px-3 py-1 rounded transition-all ${
                        imageSourceType === 'url'
                          ? 'bg-[var(--color-primary)] text-black font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Dán URL
                    </button>
                  </div>

                  {imageSourceType === 'upload' ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white focus:border-[var(--color-primary)] outline-none transition-all text-xs file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-primary)]/20 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/30 file:cursor-pointer"
                      />
                      {newWordData.imageUrl && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 mt-1">
                          <img
                            src={newWordData.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setNewWordData((prev) => ({ ...prev, imageUrl: '' }))}
                            className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. https://images.unsplash.com/photo-..."
                      value={newWordData.imageUrl}
                      onChange={(e) => setNewWordData({ ...newWordData, imageUrl: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 btn-secondary text-center py-2.5 uppercase tracking-wider"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 btn-primary text-center py-2.5 uppercase tracking-wider"
                    style={{ borderColor: 'var(--color-primary)', boxShadow: '0 0 10px rgba(0,240,255,0.15)' }}
                  >
                    {formSubmitting ? 'Đang tạo...' : 'Lưu lại'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAIThemeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4 border border-[var(--color-primary)]/30 shadow-[0_0_30px_rgba(0,240,255,0.15)]"
            >
              <button
                onClick={() => setShowAIThemeModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-[var(--color-primary)] animate-pulse" />
                <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-[var(--color-primary)] text-glow">
                  AI Sinh Từ Mới
                </h3>
              </div>

              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Gemini AI sẽ lập tức sinh ra 10 từ vựng tiếng Anh hoàn toàn mới và các câu hỏi trắc nghiệm tương ứng dựa trên chủ đề bạn đã chọn.
              </p>

              {/* Grid of Preset themes */}
              <div className="space-y-2">
                <span className="block text-xs font-mono text-gray-400">Chọn chủ đề phổ biến:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Cyberpunk', label: 'Cyberpunk 🌐', color: '#00f0ff' },
                    { id: 'Sci-Fi', label: 'Sci-Fi 🚀', color: '#f59e0b' },
                    { id: 'Tech', label: 'Tech ⚙️', color: '#3b82f6' },
                    { id: 'Security', label: 'Security 🛡️', color: '#ef4444' },
                    { id: 'Network', label: 'Network 📡', color: '#22c55e' },
                    { id: 'AI', label: 'AI 🤖', color: '#a855f7' }
                  ].map((preset) => {
                    const isSelected = selectedAITheme === preset.id && !customAITheme;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAITheme(preset.id);
                          setCustomAITheme('');
                        }}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-mono font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-black/80 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border-[var(--color-primary)]'
                            : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                        style={{
                          borderColor: isSelected ? preset.color : undefined,
                          boxShadow: isSelected ? `0 0 10px ${preset.color}30` : undefined
                        }}
                      >
                        <span className="truncate w-full">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Theme input */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-gray-400">Hoặc tự nhập chủ đề tùy chỉnh:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Space Travel, Hacking, Medicine, Animals..."
                  value={customAITheme}
                  onChange={(e) => setCustomAITheme(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs focus:border-[var(--color-primary)] outline-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAIThemeModal(false)}
                  className="flex-1 btn-secondary text-center py-2.5 uppercase tracking-wider text-xs cursor-pointer"
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
                  className="flex-1 btn-primary text-center py-2.5 uppercase tracking-wider text-xs cursor-pointer"
                  style={{ borderColor: 'var(--color-accent)', boxShadow: '0 0 10px rgba(252,238,10,0.15)' }}
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

export default Vocabulary;
