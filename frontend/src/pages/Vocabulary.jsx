import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ChevronRight, ChevronLeft, Search, Loader2,
  Heart, Database, Sparkles, Grid3X3, Layers, X, BookOpen,
  GraduationCap, ArrowLeft, CheckCircle, Target, Zap,
  RotateCcw, Plus, Pencil, Trash2, Brain
} from 'lucide-react';
import { getVocabulary, getThemes, toggleFavoriteWord, createVocabulary, updateVocabulary, deleteVocabulary, getFavoriteVocabulary, getLearnedWordIds, markWordLearned } from '../services/vocabularyService';
import { seedDatabase, generateAIWords } from '../services/seedService';
import { submitQuiz } from '../services/quizService';
import { getMyStats } from '../services/statsService';
import { pageVariants } from '../animations/variants';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

const VALID_TABS = ['theme', 'browse', 'favorites'];

/* ── Flashcard keyboard shortcuts ─────────────────────────────────────── */
const useFlashcardKeyboard = ({ enabled, onPrev, onNext, onFlip }) => {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const onFlipRef = useRef(onFlip);

  useEffect(() => { onPrevRef.current = onPrev; }, [onPrev]);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onFlipRef.current = onFlip; }, [onFlip]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevRef.current?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNextRef.current?.();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onFlipRef.current?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
};

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
  AI: { color: '#a855f7', bg: '#a855f715', emoji: '🤖', level: 'Advanced' },
  Cyber: { color: '#0ea5e9', bg: '#0ea5e915', emoji: '🌐', level: 'Advanced' },
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
  return THEME_CONFIG[t] || { color: '#6b7280', bg: '#6b728015', emoji: '📝', level: 'Beginner' };
};

const getLevelBadgeStyle = (lvl) => {
  switch (lvl) {
    case 'Advanced':
      return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900';
    case 'Intermediate':
      return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900';
    case 'Special':
      return 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900';
    default:
      return 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900';
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY SESSION — học theo chủ đề với chế độ flashcard + quiz nhỏ
   Đã thêm favorites & onToggleFav để đồng bộ yêu thích trực tiếp
   Đã cập nhật giao diện Flashcard lật 3D thực tế
   Đã sử dụng các nút bấm 3D
═══════════════════════════════════════════════════════════════════════════ */
const StudySession = ({ theme, themeColor, onExit, favorites, onToggleFav, learnedIds, onMarkLearned, user, srsMode = false }) => {
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
  const [earnedXp, setEarnedXp] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

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

  const displayWords = useMemo(() => {
    if (theme !== '__favorites__' || !srsMode || !learnedIds?.length) return words;
    return [...words].sort((a, b) => {
      const aLearned = learnedIds.some((id) => id.toString() === a.id.toString());
      const bLearned = learnedIds.some((id) => id.toString() === b.id.toString());
      return Number(aLearned) - Number(bLearned);
    });
  }, [words, theme, srsMode, learnedIds]);

  /* Restore learned state from server */
  useEffect(() => {
    if (!words.length || !learnedIds?.length) return;
    const learnedSet = new Set(
      words.filter((w) => learnedIds.some((id) => id.toString() === w.id.toString())).map((w) => w.id)
    );
    setLearned(learnedSet);
  }, [words, learnedIds]);

  /* Build quiz questions from words */
  const quizQuestions = useMemo(() => {
    if (displayWords.length < 2) return [];
    return displayWords.map((w) => {
      // pick 3 wrong options
      const wrong = displayWords
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
  }, [displayWords]);

  /* Study navigation */
  const markLearned = async () => {
    const wordId = displayWords[currentIdx].id;
    if (!learned.has(wordId)) {
      setLearned((prev) => new Set([...prev, wordId]));
      if (user) {
        try {
          await onMarkLearned(wordId);
        } catch {
          setLearned((prev) => {
            const next = new Set(prev);
            next.delete(wordId);
            return next;
          });
          toast.error('Không thể lưu tiến độ học.');
          return;
        }
      } else {
        toast('Đăng nhập để lưu tiến độ học lâu dài', { icon: '📚' });
      }
    }
    if (currentIdx < displayWords.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIdx((i) => i + 1), 150);
    }
  };

  const goNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, displayWords.length - 1)), 150);
  };
  const goPrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.max(i - 1, 0)), 150);
  };

  useFlashcardKeyboard({
    enabled: mode === 'study' && displayWords.length > 0,
    onPrev: goPrev,
    onNext: goNext,
    onFlip: () => setIsFlipped((f) => !f),
  });

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

  /* Persist quiz results to backend when done */
  const { updateUser: updateAuthUser, user: authUser } = useAuth();

  useEffect(() => {
    if (!quizDone) return;
    const save = async () => {
      if (!authUser) {
        toast('Đăng nhập để lưu điểm học', { icon: '📚' });
        return;
      }
      try {
        setSubmittingQuiz(true);
        const res = await submitQuiz(score, quizQuestions.length);
        const earned = res?.earnedXp ?? res?.earned ?? res?.xpDelta ?? 0;
        setEarnedXp(earned);
        toast.success(`Bạn nhận +${earned} XP`);
        if (res?.xp || res?.level) {
          updateAuthUser({ xp: res.xp, level: res.level });
        }
        // trigger a stats refresh elsewhere (Dashboard listens on authUser change)
        try { await getMyStats().catch(() => {}); } catch (e) { }
      } catch (e) {
        console.error('Failed to submit vocab quiz', e);
        toast.error('Không lưu được kết quả quiz. Vui lòng thử lại sau.');
      } finally {
        setSubmittingQuiz(false);
      }
    };
    save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizDone]);

  const cfg = getThemeConfig(theme);
  const progress = displayWords.length ? Math.round((learned.size / displayWords.length) * 100) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
      <p className="font-bold text-sm text-[var(--color-primary)]">Đang tải học phần chủ đề {theme}...</p>
    </div>
  );

  if (displayWords.length === 0) return (
    <div className="text-center py-20 bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] rounded-2xl p-8 max-w-md mx-auto">
      <p className="text-[var(--color-text-muted)] font-bold">Chủ đề này chưa có từ vựng nào.</p>
      <button onClick={onExit} className="mt-6 btn-3d-secondary flex items-center gap-2 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>
    </div>
  );

  const currentWord = displayWords[currentIdx];
  const isFav = favorites?.includes(currentWord?.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* ── Session header ── */}
      <div className="flex items-center justify-between gap-4 bg-[var(--color-surface)] p-4 rounded-2xl border-2 border-[var(--color-surface-border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-xl border-2 border-[var(--color-surface-border)] hover:bg-[var(--color-bg)] transition-all cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{cfg.emoji}</span>
              <h2 className="text-base font-black uppercase tracking-wider text-[var(--color-text)]">
                Chủ đề: {theme}{srsMode ? ' · Ôn thông minh' : ''}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 border rounded-md tracking-wider bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)]">
                {displayWords.length} từ
              </span>
              <div className="w-20 h-1.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-accent)] rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{learned.size}/{displayWords.length} đã học</span>
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] p-1 rounded-xl">
          <button
            onClick={() => setMode('study')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mode === 'study' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
          >
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Học thẻ</span>
          </button>
          <button
            onClick={startQuiz}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mode === 'quiz' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
          >
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Thử thách</span>
          </button>
        </div>
      </div>

      {/* ──═ STUDY MODE ═── */}
      {mode === 'study' && (
        <div className="space-y-6">
          {/* 3D Flashcard container with fixed height to avoid collapsing */}
          <div className="w-full h-80 perspective-1000 select-none cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

              {/* Front Side */}
              <div className="absolute inset-0 backface-hidden card-3d p-8 flex flex-col items-center justify-center text-center bg-[var(--color-surface)] border-2 hover:border-sky-300 dark:hover:border-sky-700">
                {currentWord.imageUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.04] rounded-2xl pointer-events-none"
                    style={{ backgroundImage: `url(${currentWord.imageUrl})` }}
                  />
                )}

                {/* Heart & Status headers */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
                  <span
                    className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border"
                    style={{ background: cfg.bg, color: themeColor, borderColor: themeColor + '30' }}
                  >
                    {currentWord.type}
                  </span>

                  <div className="flex items-center gap-2">
                    {learned.has(currentWord.id) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900 px-2 py-0.5 rounded-lg">
                        Đã học
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFav(currentWord.id);
                      }}
                      className="p-1.5 rounded-lg border-2 border-[var(--color-surface-border)] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-[var(--color-text-muted)]'}`} />
                    </button>
                  </div>
                </div>

                {/* Core word info */}
                <h2 className="text-4xl md:text-5xl font-black text-[var(--color-text)] mb-2 tracking-wide mt-4">{currentWord.word}</h2>
                <p className="text-lg font-bold font-mono text-[var(--color-primary)] mb-5">{currentWord.ipa}</p>

                <button
                  onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                  className="p-3 rounded-xl border-2 border-[var(--color-surface-border)] text-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all pointer-events-auto active:scale-95"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <p className="absolute bottom-4 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">
                  Chạm / Space để lật · ← → chuyển từ
                </p>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 card-3d p-8 flex flex-col items-center justify-center text-center bg-[var(--color-surface)] border-2 hover:border-sky-300 dark:hover:border-sky-700">
                <span className="absolute top-4 left-4 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-orange-50 border border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900">
                  Định nghĩa
                </span>

                <p className="text-2xl md:text-3xl font-black text-[var(--color-text)] leading-relaxed mb-4">{currentWord.meaning}</p>
                <div className="w-12 h-1 bg-[var(--color-surface-border)] rounded-full mb-4" />
                <p className="text-[var(--color-text-muted)] italic text-sm font-bold max-w-md">"{currentWord.example}"</p>

                <button
                  onClick={(e) => { e.stopPropagation(); speak(currentWord.example, 0.8); }}
                  className="mt-4 flex items-center gap-1.5 text-xs font-bold border-2 border-[var(--color-surface-border)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-bg)] transition-colors pointer-events-auto"
                >
                  <Volume2 className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Nghe ví dụ</span>
                </button>

                <p className="absolute bottom-4 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">
                  Chạm / Space để quay lại mặt trước
                </p>
              </div>

            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-2xl border-2 border-[var(--color-surface-border)]">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="p-3 rounded-xl border-2 border-[var(--color-surface-border)] text-[var(--color-text-muted)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 flex flex-col items-center gap-2 overflow-hidden">
              {/* Dot progress */}
              <div className="flex gap-1.5 flex-wrap justify-center max-w-xs max-h-12 overflow-y-auto px-1 py-1">
                {displayWords.map((w, i) => (
                  <div
                    key={w.id}
                    onClick={() => { setIsFlipped(false); setCurrentIdx(i); }}
                    className="w-2.5 h-2.5 rounded-full cursor-pointer transition-all"
                    style={{
                      background: learned.has(w.id) ? '#58cc02'
                        : i === currentIdx ? 'var(--color-primary)' : 'var(--color-surface-border)',
                      transform: i === currentIdx ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Từ vựng {currentIdx + 1} trên tổng {displayWords.length}</p>
            </div>

            <button
              onClick={goNext}
              disabled={currentIdx === displayWords.length - 1}
              className="p-3 rounded-xl border-2 border-[var(--color-surface-border)] text-[var(--color-text-muted)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={markLearned}
              className={`flex-1 btn-3d py-3 rounded-2xl text-xs font-black tracking-wider uppercase border-2 flex items-center justify-center gap-2 ${learned.has(currentWord?.id)
                  ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900 border-b-[4px]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-surface-border)]'
                }`}
              style={{
                borderBottomColor: learned.has(currentWord?.id) ? '#46a302' : undefined
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {learned.has(currentWord?.id) ? 'Đã học xong thẻ' : 'Đánh dấu đã học'}
            </button>
            {learned.size === displayWords.length && (
              <button
                onClick={startQuiz}
                className="flex-1 btn-3d-success py-3 rounded-2xl text-xs font-black tracking-wider uppercase animate-pulse"
              >
                <Target className="w-4 h-4" /> Bắt đầu kiểm tra!
              </button>
            )}
          </div>

          {/* Word list mini inside Study Session */}
          <div className="card-3d p-4 bg-[var(--color-surface)]">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Mục lục từ vựng ({displayWords.length})
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {displayWords.map((w, i) => (
                <button
                  key={w.id}
                  onClick={() => { setIsFlipped(false); setCurrentIdx(i); }}
                  className={`text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${i === currentIdx
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                >
                  {learned.has(w.id) && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  <span className="truncate">{w.word}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──═ QUIZ CHALLENGE MODE ═── */}
      {mode === 'quiz' && (
        <div>
          {quizDone ? (
            /* Quiz result */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-3d p-8 text-center space-y-6"
            >
              <div className="text-5xl select-none">
                {score / quizQuestions.length >= 0.8 ? '🥇' : score / quizQuestions.length >= 0.5 ? '⚡' : '💡'}
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider text-[var(--color-primary)]">
                Hoàn Thành Thử Thách
              </h3>

              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface-border)" strokeWidth="10" />
                  <motion.circle
                    cx="50" cy="50" r="40" fill="transparent"
                    stroke={themeColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray="251"
                    initial={{ strokeDashoffset: 251 }}
                    animate={{ strokeDashoffset: 251 - (251 * score / quizQuestions.length) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute text-center flex flex-col items-center">
                  <p className="text-2xl font-black text-[var(--color-text)]">{Math.round(score / quizQuestions.length * 100)}%</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold">{score}/{quizQuestions.length} đúng</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <div className="flex items-center gap-3 mr-2">
                  {submittingQuiz ? (
                    <div className="text-sm text-[var(--color-text-muted)]">Đang lưu kết quả...</div>
                  ) : earnedXp !== null ? (
                    <div className="text-sm font-bold text-[var(--color-primary)]">Bạn nhận <span className="text-lg">+{earnedXp} XP</span></div>
                  ) : null}
                </div>
                <button onClick={startQuiz} className="btn-3d-secondary flex items-center gap-2 text-xs">
                  <RotateCcw className="w-4 h-4" /> Làm lại
                </button>
                <button onClick={() => setMode('study')} className="btn-3d-primary flex items-center gap-2 text-xs py-2.5">
                  <Layers className="w-4 h-4" /> Tiếp tục học
                </button>
              </div>
            </motion.div>
          ) : quizQuestion ? (
            /* Quiz question */
            <motion.div
              key={quizIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-3d p-6 space-y-6"
            >
              {/* Progress */}
              <div className="flex justify-between items-center text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                <span>Câu hỏi {quizIdx + 1} / {quizQuestions.length}</span>
                <span className="flex items-center gap-1.5 text-orange-500 font-extrabold">
                  <Zap className="w-4 h-4 fill-current text-yellow-500" />
                  {score} đúng
                </span>
              </div>
              <div className="w-full h-2.5 bg-[var(--color-surface-border)] rounded-full overflow-hidden border">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[var(--color-accent)]"
                  style={{ width: `${(quizIdx / quizQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="text-center py-4 bg-[var(--color-bg)] rounded-2xl border-2 border-[var(--color-surface-border)]">
                <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider mb-2">Chọn nghĩa tiếng Việt chính xác</p>
                <h3 className="text-3xl font-black text-[var(--color-text)]">{quizQuestion.word}</h3>
                <p className="font-mono mt-1 text-[var(--color-primary)] font-bold text-sm">{quizQuestion.ipa}</p>
                <button
                  onClick={() => speak(quizQuestion.word)}
                  className="mt-3 p-2 rounded-xl border-2 border-[var(--color-surface-border)] hover:bg-[var(--color-surface)] text-[var(--color-primary)] active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {quizQuestion.options.map((opt, idx) => {
                  let btnStyle = 'border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)]';
                  let borderBottomColor = undefined;

                  if (quizAnswered) {
                    if (idx === quizQuestion.answerIdx) {
                      btnStyle = 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900 border-b-[4px]';
                      borderBottomColor = '#46a302';
                    } else if (idx === quizQuestion.answerIdx) {
                      // no other style
                    } else {
                      btnStyle = 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed';
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!quizAnswered ? { scale: 1.005 } : {}}
                      onClick={() => answerQuiz(idx)}
                      disabled={quizAnswered}
                      className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all flex items-center gap-3 active:translate-y-[2px] cursor-pointer ${btnStyle}`}
                      style={{
                        borderBottomColor
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border"
                        style={{
                          background: 'rgba(0,0,0,0.02)',
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
                  className="flex justify-between items-center pt-2 border-t border-[var(--color-surface-border)]"
                >
                  <p className={`text-sm font-bold ${quizCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    {quizCorrect ? '✓ Hoàn hảo!' : '✗ Hãy ghi nhớ nhé!'}
                  </p>
                  <button
                    onClick={nextQuiz}
                    className="btn-3d-primary flex items-center gap-1.5 text-xs py-2 px-4"
                  >
                    {quizIdx + 1 < quizQuestions.length ? 'Tiếp tục' : 'Xem điểm số'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-3d p-8 text-center space-y-4"
            >
              <Target className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-40" />
              <h3 className="text-lg font-black uppercase text-[var(--color-primary)]">
                Không Đủ Dữ Liệu Câu Hỏi
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed max-w-sm mx-auto">
                Chủ đề này chỉ có {displayWords.length} từ vựng. Cần tối thiểu 2 từ vựng trở lên để hệ thống có thể tạo các đáp án trắc nghiệm.
              </p>
              <button
                onClick={() => setMode('study')}
                className="btn-3d-secondary px-5 py-2 mx-auto flex items-center gap-2 mt-2"
              >
                <Layers className="w-3.5 h-3.5" /> Quay lại tự học
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   THEME SELECTOR — màn hình chọn chủ đề dạng khóa học
   Lấy cảm hứng từ Duolingo & Elsa: Thêm Badge Cấp Độ và thanh tiến trình đã học
═══════════════════════════════════════════════════════════════════════════ */
const ThemeSelector = ({ themes, onSelectTheme, user }) => {
  if (themes.length === 0) return (
    <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border-2 border-[var(--color-surface-border)] p-8">
      <p className="text-[var(--color-text-muted)] font-bold">Chưa tìm thấy chủ đề học nào. Vui lòng bấm AI sinh từ vựng mới!</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {themes.map(({ theme, count, learnedCount = 0 }, i) => {
        const cfg = getThemeConfig(theme);
        const levelBadgeStyle = getLevelBadgeStyle(cfg.level);
        const progress = count > 0 ? Math.min(100, Math.round((learnedCount / count) * 100)) : 0;
        return (
          <motion.div
            key={theme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-3d bg-[var(--color-surface)] hover:-translate-y-1 transition-transform group flex flex-col justify-between"
          >
            <div className="p-5 flex-1">
              {/* Header inside course card */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-[var(--color-surface-border)]" style={{ background: cfg.bg }}>
                  {cfg.emoji}
                </div>

                {/* Level badge */}
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-wider select-none ${levelBadgeStyle}`}>
                  {cfg.level}
                </span>
              </div>

              <h3 className="font-black text-lg mb-1 text-[var(--color-text)]">
                {theme}
              </h3>
              <p className="text-[var(--color-text-muted)] text-xs font-bold mb-4">{count} từ vựng học phần</p>
            </div>

            {/* Bottom progress metrics & CTA */}
            <div className="px-5 pb-5 border-t border-[var(--color-surface-border)] pt-4 mt-auto">
              <div className="flex justify-between text-[10px] font-bold text-[var(--color-text-muted)] mb-2">
                <span>TIẾN ĐỘ HỌC</span>
                <span>
                  {user ? `${learnedCount}/${count} từ · ${progress}%` : `${count} từ`}
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--color-surface-border)] rounded-full overflow-hidden border">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${user ? progress : 0}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                />
              </div>

              <button
                onClick={() => onSelectTheme(theme, cfg.color)}
                className="w-full mt-4 btn-3d-secondary py-2 px-3 text-xs select-none"
              >
                <GraduationCap className="w-4 h-4 inline mr-1 text-[var(--color-primary)]" />
                Vào học ngay
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN VOCABULARY PAGE
═══════════════════════════════════════════════════════════════════════════ */
const Vocabulary = () => {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      if (!user) {
        toast.error('Bạn cần đăng nhập để thêm từ vựng!');
      } else {
        setShowAddForm(true);
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user]);

  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState(() => (VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'theme'));

  useEffect(() => {
    const nextTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'theme';
    setTab((prev) => (prev !== nextTab ? nextTab : prev));
  }, [tabFromUrl]);

  const changeTab = useCallback((key) => {
    setTab(key);
    const newParams = new URLSearchParams(searchParams);
    if (key === 'theme') newParams.delete('tab');
    else newParams.set('tab', key);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  const [words, setWords] = useState([]);
  const [themes, setThemes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('');
  const [viewMode, setViewMode] = useState('flashcard');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [studyTheme, setStudyTheme] = useState(null);
  const [studyThemeColor, setStudyThemeColor] = useState('#1cb0f6');
  const [studySrsMode, setStudySrsMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWordId, setEditingWordId] = useState(null);
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
  const [learnedIds, setLearnedIds] = useState([]);
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

  const fetchLearnedIds = useCallback(async () => {
    if (!user) {
      setLearnedIds([]);
      return;
    }
    try {
      const ids = await getLearnedWordIds();
      setLearnedIds(ids);
    } catch {
      /* silent — session can still work locally */
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLearnedIds();
  }, [fetchLearnedIds]);

  const fetchWords = useCallback(async (pageNum, append = false, filterTheme = '', filterSearch = '') => {
    if (!append) setBrowseLoading(true); else setLoadingMore(true);
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
      setBrowseLoading(false);
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
    if (tab !== 'browse') return;
    setPage(1);
    const delayDebounce = setTimeout(() => {
      fetchWords(1, false, selectedThemeFilter, searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [selectedThemeFilter, searchTerm, fetchWords, tab]);

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
    const id = toast.loading(`AI đang sinh từ vựng về chủ đề "${theme}"...`);
    try {
      const data = await generateAIWords(theme);
      toast.success(data.message || 'AI sinh từ vựng thành công!', { id });
      await Promise.all([fetchWords(1, false, selectedThemeFilter, searchTerm), fetchThemes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể liên kết AI.', { id });
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
        if (entry.phonetic) {
          ipaStr = entry.phonetic;
        } else if (entry.phonetics && entry.phonetics.length > 0) {
          const withText = entry.phonetics.find(p => p.text);
          if (withText) ipaStr = withText.text;
        }

        if (entry.meanings && entry.meanings.length > 0) {
          const firstMeaning = entry.meanings[0];
          const pos = firstMeaning.partOfSpeech.toLowerCase();
          if (pos.includes('noun')) typeStr = 'noun';
          else if (pos.includes('verb')) typeStr = 'verb';
          else if (pos.includes('adjective')) typeStr = 'adj';
          else if (pos.includes('adverb')) typeStr = 'adv';
        }

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

  const resetWordForm = () => {
    setEditingWordId(null);
    setNewWordData({
      word: '',
      ipa: '',
      meaning: '',
      type: 'noun',
      example: '',
      theme: 'General',
      imageUrl: '',
    });
  };

  const refreshWordLists = async () => {
    await fetchThemes();
    if (tab === 'browse') {
      await fetchWords(1, false, selectedThemeFilter, searchTerm);
    }
    if (tab === 'favorites') {
      await fetchFavoriteWords();
    }
  };

  const openEditForm = (word) => {
    if (!user) return toast.error('Bạn cần đăng nhập để sửa từ vựng!');
    setEditingWordId(word.id);
    setNewWordData({
      word: word.word,
      ipa: word.ipa,
      meaning: word.meaning,
      type: word.type,
      example: word.example || '',
      theme: word.theme || 'General',
      imageUrl: word.imageUrl || '',
    });
    setImageSourceType(word.imageUrl?.startsWith('data:') ? 'upload' : 'url');
    setShowAddForm(true);
  };

  const handleDeleteWord = async (word) => {
    if (!user) return toast.error('Bạn cần đăng nhập để xóa từ vựng!');
    if (!window.confirm(`Xóa từ "${word.word}" khỏi kho từ vựng?`)) return;
    try {
      const data = await deleteVocabulary(word.id);
      toast.success(data.message || 'Đã xóa từ vựng!');
      await refreshWordLists();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa từ vựng.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Bạn cần đăng nhập để thực hiện!');
    setFormSubmitting(true);
    try {
      const data = editingWordId
        ? await updateVocabulary(editingWordId, newWordData)
        : await createVocabulary(newWordData);
      toast.success(data.message || (editingWordId ? 'Cập nhật từ vựng thành công!' : 'Thêm từ vựng mới thành công!'));
      setShowAddForm(false);
      resetWordForm();
      await refreshWordLists();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu từ vựng.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleFav = async (wordId) => {
    if (!user) return toast.error('Bạn cần đăng nhập để lưu từ vựng!');
    try {
      const data = await toggleFavoriteWord(wordId);
      setFavorites(data.favoriteWords);
      toast.success(data.favoriteWords.includes(wordId) ? '❤️ Thêm vào yêu thích!' : '💔 Đã xóa yêu thích');
    } catch { toast.error('Có lỗi xảy ra.'); }
  };

  const handleMarkLearned = async (wordId) => {
    const data = await markWordLearned(wordId);
    setLearnedIds(data.wordsLearned);
    updateUser({ wordsLearned: data.wordsLearned });
    fetchThemes();
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    await fetchWords(next, true, selectedThemeFilter, searchTerm);
  };

  const filteredWords = words;
  const allThemes = useMemo(() => themes.map(t => t.theme).filter(Boolean).sort(), [themes]);
  const goTo = (idx) => { setIsFlipped(false); setTimeout(() => setCurrentIndex(idx), 150); };
  const browseGoPrev = () => goTo(Math.max(currentIndex - 1, 0));
  const browseGoNext = () => goTo(Math.min(currentIndex + 1, filteredWords.length - 1));
  const totalWords = themes.reduce((s, t) => s + t.count, 0);
  const unlearnedFavoriteCount = useMemo(
    () => favoriteWordsList.filter((w) => !learnedIds.some((id) => id.toString() === w.id.toString())).length,
    [favoriteWordsList, learnedIds]
  );

  useFlashcardKeyboard({
    enabled: tab === 'browse' && viewMode === 'flashcard' && filteredWords.length > 0 && !showAddForm && !showAIThemeModal,
    onPrev: browseGoPrev,
    onNext: browseGoNext,
    onFlip: () => setIsFlipped((f) => !f),
  });

  /* Study session view handler */
  if (studyTheme) {
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-7xl mx-auto px-4 pt-4">
        <StudySession
          theme={studyTheme}
          themeColor={studyThemeColor}
          onExit={() => { setStudyTheme(null); setStudySrsMode(false); fetchThemes(); }}
          favorites={favorites}
          onToggleFav={handleToggleFav}
          learnedIds={learnedIds}
          onMarkLearned={handleMarkLearned}
          user={user}
          srsMode={studySrsMode}
        />
      </motion.div>
    );
  }

  if (tab === 'browse' && browseLoading && page === 1) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
      <span className="font-bold text-[var(--color-primary)] text-sm">Đang tải kho từ vựng...</span>
    </div>
  );

  if (error && tab === 'browse') return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <BookOpen className="w-16 h-16 text-[var(--color-secondary)] opacity-50 mx-auto" />
      <p className="text-[var(--color-secondary)] font-bold text-lg">{error}</p>
      <div className="flex gap-4">
        <button onClick={handleSeed} disabled={seeding} className="btn-3d-primary flex items-center gap-2 px-6 py-3">
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
          className="btn-3d-secondary flex items-center gap-2 px-6 py-3"
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Sinh Từ Mới
        </button>
      </div>
    </div>
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-7xl mx-auto px-4 pb-16 pt-4 bg-[var(--color-bg)]">
      {/* ── Page header ── */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-[var(--color-surface)] p-5 rounded-2xl border-2 border-[var(--color-surface-border)]">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-[var(--color-primary)] mb-1">
            Kho từ vựng thông minh
          </h1>
          <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide">{totalWords} từ vựng · {themes.length} chủ đề học phần</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              if (!user) return toast.error('Bạn cần đăng nhập để thêm từ vựng!');
              resetWordForm();
              setShowAddForm(true);
            }}
            className="btn-3d-secondary flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Thêm từ mới
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn-3d-secondary flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            {seeding
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang Reset...</>
              : <><Database className="w-4 h-4 text-[var(--color-primary)]" /> Reset dữ liệu</>
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
            className="btn-3d-primary flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            {aiLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
              : <><Sparkles className="w-4 h-4 text-white" /> AI sinh từ</>
            }
          </button>
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <div className="flex gap-1.5 bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] p-1 rounded-2xl w-fit mb-6">
        {[
          { key: 'theme', label: 'Bài học chủ đề', icon: <GraduationCap className="w-4 h-4" /> },
          { key: 'browse', label: 'Duyệt từ điển', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'favorites', label: 'Từ yêu thích', icon: <Heart className="w-4 h-4" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${tab === key
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ TAB: BÀI HỌC CHỦ ĐỀ ═══ */}
        {tab === 'theme' && (
          <motion.div key="theme" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-6">
              <h2 className="text-base font-black uppercase tracking-wider text-[var(--color-text)] mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[var(--color-primary)]" /> Lựa chọn bài học tiếng Anh
              </h2>
              <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide">
                Học qua thẻ Flashcard 3D kết hợp làm bài kiểm tra phản xạ nơ-ron
              </p>
            </div>
            <ThemeSelector
              themes={themes}
              onSelectTheme={(theme, color) => { setStudyTheme(theme); setStudyThemeColor(color); }}
              user={user}
            />
          </motion.div>
        )}

        {/* ═══ TAB: DUYỆT TỪ ĐIỂN ═══ */}
        {tab === 'browse' && (
          <motion.div key="browse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-[var(--color-surface)] p-4 rounded-2xl border-2 border-[var(--color-surface-border)]">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ hoặc nghĩa..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentIndex(0); }}
                  className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl py-2 pl-10 pr-8 text-xs font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); setCurrentIndex(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Theme filtering */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Bộ lọc:</span>
                <button
                  onClick={() => { setSelectedThemeFilter(''); setCurrentIndex(0); }}
                  className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border transition-all uppercase tracking-wider cursor-pointer ${!selectedThemeFilter ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-surface-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-gray-300'
                    }`}
                >Tất cả</button>
                {allThemes.map((theme) => {
                  const cfg = getThemeConfig(theme);
                  const isSelected = selectedThemeFilter === theme;
                  return (
                    <button
                      key={theme}
                      onClick={() => { setSelectedThemeFilter(isSelected ? '' : theme); setCurrentIndex(0); }}
                      className="text-[9px] font-black px-2.5 py-1.5 rounded-lg border transition-all uppercase tracking-wider cursor-pointer"
                      style={{
                        background: isSelected ? cfg.color : 'var(--color-bg)',
                        borderColor: isSelected ? cfg.color : 'var(--color-surface-border)',
                        color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                      }}
                    >{theme}</button>
                  );
                })}
              </div>

              {/* View mode toggle */}
              <div className="flex gap-1 sm:ml-auto">
                {[{ mode: 'flashcard', icon: <Layers className="w-4 h-4" /> }, { mode: 'grid', icon: <Grid3X3 className="w-4 h-4" /> }].map(({ mode, icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${viewMode === mode ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {totalWords === 0 ? (
              <div className="card-3d p-8 text-center max-w-xl mx-auto bg-[var(--color-surface)] my-10">
                <BookOpen className="w-12 h-12 text-[var(--color-primary)] opacity-40 mx-auto mb-4" />
                <h3 className="text-lg font-black text-[var(--color-text)] mb-2 uppercase">Kho từ vựng chưa được tạo</h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-6 font-medium max-w-md mx-auto leading-relaxed">
                  Hiện bạn chưa có từ vựng nào. Hãy bấm nạp dữ liệu mẫu hoặc sử dụng Gemini AI tự sinh từ vựng để bắt đầu học nhé!
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="btn-3d-secondary flex items-center gap-2 px-5 py-2.5 text-xs"
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
                    className="btn-3d-primary flex items-center gap-2 px-5 py-2.5 text-xs"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Sinh Từ Mới
                  </button>
                </div>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-16 text-[var(--color-text-muted)] font-bold bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] rounded-2xl">
                <p className="mb-2">Không tìm thấy từ vựng nào phù hợp.</p>
                <button
                  onClick={() => { setSelectedThemeFilter(''); setSearchTerm(''); }}
                  className="text-xs text-[var(--color-primary)] font-bold underline hover:text-[var(--color-primary-hover)] transition-colors"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : viewMode === 'flashcard' ? (
              /* ── Flashcard view ── */
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                {/* List scrollbox */}
                <div className="card-3d p-3 h-[520px] flex flex-col bg-[var(--color-surface)]">
                  <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider px-2 mb-2">Danh sách từ ({filteredWords.length})</p>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {filteredWords.map((w, i) => {
                      const cfg = getThemeConfig(w.theme);
                      const isCurrent = i === currentIndex;
                      return (
                        <button
                          key={w.id}
                          onClick={() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(i), 80); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left border-2 transition-all cursor-pointer ${isCurrent ? 'bg-sky-50 dark:bg-sky-950/30 border-[var(--color-primary)]' : 'border-transparent hover:bg-[var(--color-bg)]'}`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-xs truncate ${isCurrent ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{w.word}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] truncate font-bold uppercase mt-0.5">{w.meaning}</p>
                          </div>
                          {favorites.includes(w.id) && <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />}
                        </button>
                      );
                    })}
                    {hasMore && (
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full mt-2 btn-3d-secondary py-2 text-xs font-black"
                      >
                        {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tải thêm từ'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3D Flashcard render with perspective wrapper */}
                {filteredWords[currentIndex] && (() => {
                  const w = filteredWords[currentIndex];
                  const cfg = getThemeConfig(w.theme);
                  const isCurrentFav = favorites.includes(w.id);
                  return (
                    <div className="flex flex-col gap-6 items-center">
                      <div className="w-full h-80 perspective-1000 select-none cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                        <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                          {/* Front face */}
                          <div className="absolute inset-0 backface-hidden card-3d p-8 flex flex-col items-center justify-center text-center bg-[var(--color-surface)] border-2">
                            {w.imageUrl && <div className="absolute inset-0 bg-cover bg-center opacity-[0.04] rounded-2xl pointer-events-none" style={{ backgroundImage: `url(${w.imageUrl})` }} />}

                            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
                              <div className="flex gap-2">
                                <span className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{w.theme}</span>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] uppercase tracking-wider">{w.type}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {user && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openEditForm(w); }}
                                      className="p-1.5 rounded-lg border-2 border-[var(--color-surface-border)] hover:bg-[var(--color-bg)] transition-colors"
                                      title="Sửa từ"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteWord(w); }}
                                      className="p-1.5 rounded-lg border-2 border-[var(--color-surface-border)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      title="Xóa từ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleFav(w.id); }}
                                  className="p-1.5 rounded-lg border-2 border-[var(--color-surface-border)] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                >
                                  <Heart className={`w-4 h-4 ${isCurrentFav ? 'text-red-500 fill-red-500' : 'text-[var(--color-text-muted)]'}`} />
                                </button>
                              </div>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black text-[var(--color-text)] mb-2">{w.word}</h2>
                            <p className="text-lg font-bold font-mono text-[var(--color-primary)] mb-5">{w.ipa}</p>

                            <button
                              onClick={(e) => { e.stopPropagation(); speak(w.word); }}
                              className="p-3 rounded-xl border-2 border-[var(--color-surface-border)] text-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors pointer-events-auto active:scale-95"
                            >
                              <Volume2 className="w-5 h-5" />
                            </button>
                            <p className="absolute bottom-4 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">
                              Chạm / Space để lật · ← → để chuyển từ
                            </p>
                          </div>

                          {/* Back face */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 card-3d p-8 flex flex-col items-center justify-center text-center bg-[var(--color-surface)] border-2">
                            <span className="absolute top-4 left-4 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-orange-50 border border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900">
                              Định nghĩa
                            </span>
                            <h3 className="text-2xl md:text-3xl font-black text-[var(--color-text)] mb-3">{w.meaning}</h3>
                            <div className="w-12 h-1 bg-[var(--color-surface-border)] rounded-full mb-3" />
                            <p className="text-[var(--color-text-muted)] italic text-sm font-bold max-w-sm">"{w.example}"</p>

                            <button
                              onClick={(e) => { e.stopPropagation(); speak(w.example, 0.8); }}
                              className="mt-4 flex items-center gap-1.5 text-xs font-bold border-2 border-[var(--color-surface-border)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-bg)] transition-colors pointer-events-auto"
                            >
                              <Volume2 className="w-4 h-4 text-[var(--color-primary)]" /> Nghe ví dụ
                            </button>
                            <p className="absolute bottom-4 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">
                              Chạm / Space để quay lại mặt trước
                            </p>
                          </div>

                        </div>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between w-full max-w-lg bg-[var(--color-surface)] p-3 rounded-2xl border-2 border-[var(--color-surface-border)]">
                        <button
                          onClick={() => goTo(currentIndex - 1)}
                          disabled={currentIndex === 0}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl border-2 border-[var(--color-surface-border)] font-bold text-xs transition-all disabled:opacity-40 hover:bg-[var(--color-bg)] cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" /> Trước
                        </button>
                        <p className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Từ {currentIndex + 1} / {filteredWords.length}</p>
                        <button
                          onClick={() => goTo(currentIndex + 1)}
                          disabled={currentIndex === filteredWords.length - 1}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl border-2 border-[var(--color-surface-border)] font-bold text-xs transition-all disabled:opacity-40 hover:bg-[var(--color-bg)] cursor-pointer"
                        >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredWords.map((w, i) => {
                    const cfg = getThemeConfig(w.theme);
                    const isF = favorites.includes(w.id);
                    return (
                      <motion.div
                        key={w.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (i % 12) * 0.04 }}
                        className="card-3d p-4 bg-[var(--color-surface)] hover:-translate-y-1 transition-transform relative overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{w.theme}</span>
                            <div className="flex items-center gap-0.5">
                              {user && (
                                <>
                                  <button onClick={() => openEditForm(w)} className="p-1 rounded-lg hover:bg-[var(--color-bg)] cursor-pointer" title="Sửa">
                                    <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                  </button>
                                  <button onClick={() => handleDeleteWord(w)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" title="Xóa">
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleToggleFav(w.id)} className="p-1 rounded-lg hover:bg-[var(--color-bg)] cursor-pointer">
                                <Heart className={`w-4 h-4 ${isF ? 'text-red-500 fill-red-500' : 'text-[var(--color-text-muted)]'}`} />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-xl font-black text-[var(--color-text)] mb-0.5">{w.word}</h3>
                          <p className="text-xs font-bold font-mono text-[var(--color-primary)] mb-2">{w.ipa}</p>
                          <p className="text-xs text-[var(--color-text-muted)] font-bold mb-4 line-clamp-2">{w.meaning}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--color-surface-border)] pt-3 mt-auto">
                          <span className="text-[9px] text-[var(--color-text-muted)] font-black border border-[var(--color-surface-border)] bg-[var(--color-bg)] px-2 py-0.5 rounded-lg uppercase tracking-wider">{w.type}</span>
                          <button
                            onClick={() => speak(w.word)}
                            className="p-1.5 rounded-xl border border-[var(--color-surface-border)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer text-[var(--color-primary)] active:scale-90"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {hasMore && (
                  <div className="text-center mt-8">
                    <button onClick={loadMore} disabled={loadingMore} className="btn-3d-secondary px-8 py-3 text-xs mx-auto">
                      {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} Tải thêm từ vựng
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB: TỪ YÊU THÍCH ═══ */}
        {tab === 'favorites' && (
          <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[var(--color-surface)] p-4 rounded-2xl border-2 border-[var(--color-surface-border)]">
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-[var(--color-text)] mb-1 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Sổ tay từ vựng ưu tú
                </h2>
                <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide">
                  Tập trung ôn tập những từ vựng bạn đã đánh dấu yêu thích
                </p>
              </div>
              {user && favoriteWordsList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {unlearnedFavoriteCount > 0 && (
                    <button
                      onClick={() => { setStudySrsMode(true); setStudyTheme('__favorites__'); setStudyThemeColor('#ef4444'); }}
                      className="btn-3d-primary flex items-center gap-2 px-5 py-2.5 text-xs"
                    >
                      <Brain className="w-4 h-4 text-white" /> Ôn từ hay quên ({unlearnedFavoriteCount})
                    </button>
                  )}
                  {favoriteWordsList.length > 1 && (
                    <button
                      onClick={() => { setStudySrsMode(false); setStudyTheme('__favorites__'); setStudyThemeColor('#ef4444'); }}
                      className="btn-3d-danger flex items-center gap-2 px-5 py-2.5 text-xs"
                    >
                      <GraduationCap className="w-4 h-4 text-white" /> Ôn tập tất cả ({favoriteWordsList.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {!user ? (
              <div className="card-3d p-10 text-center max-w-md mx-auto bg-[var(--color-surface)]">
                <Heart className="w-12 h-12 text-red-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-black text-[var(--color-text)] mb-2 uppercase">Yêu cầu đăng nhập</h3>
                <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                  Vui lòng đăng nhập tài khoản của bạn để bắt đầu lưu trữ và ôn tập danh sách từ vựng yêu thích.
                </p>
              </div>
            ) : loadingFavorites ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                <span className="text-xs text-[var(--color-text-muted)] font-bold">Đang tải sổ tay của bạn...</span>
              </div>
            ) : favoriteWordsList.length === 0 ? (
              <div className="card-3d p-10 text-center max-w-lg mx-auto bg-[var(--color-surface)]">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base font-black text-[var(--color-text)] mb-2 uppercase">Chưa có từ yêu thích</h3>
                <p className="text-xs text-[var(--color-text-muted)] font-medium">
                  Hãy chuyển sang tab "Duyệt từ điển" và click vào biểu tượng trái tim ❤️ ở các thẻ từ vựng để lưu vào đây nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteWordsList.map((w) => {
                  const cfg = getThemeConfig(w.theme);
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card-3d p-4 bg-[var(--color-surface)] hover:-translate-y-1 transition-transform relative overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                            {w.theme}
                          </span>
                          <button onClick={() => handleToggleFav(w.id)} className="p-1 rounded-lg hover:bg-[var(--color-bg)] cursor-pointer">
                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                          </button>
                        </div>
                        <h3 className="text-lg font-black text-[var(--color-text)] mb-0.5">{w.word}</h3>
                        <p className="text-xs font-bold font-mono text-[var(--color-primary)] mb-2">{w.ipa}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-bold mb-4 line-clamp-2">{w.meaning}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--color-surface-border)] pt-3 mt-auto">
                        <span className="text-[9px] text-[var(--color-text-muted)] font-black border border-[var(--color-surface-border)] bg-[var(--color-bg)] px-2 py-0.5 rounded-lg uppercase tracking-wider">{w.type}</span>
                        <button onClick={() => speak(w.word)} className="p-1.5 rounded-xl border border-[var(--color-surface-border)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer text-[var(--color-primary)]">
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

      {/* ──═ DIALOG MODAL: THÊM TỪ VỰNG ══── */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-3d w-full max-w-lg max-h-[90vh] p-6 relative flex flex-col gap-4 bg-[var(--color-surface)]"
            >
              <button
                onClick={() => { setShowAddForm(false); resetWordForm(); }}
                className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1 shrink-0">
                {editingWordId ? <Pencil className="w-6 h-6 text-[var(--color-primary)]" /> : <Plus className="w-6 h-6 text-[var(--color-primary)]" />}
                <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-text)]">
                  {editingWordId ? 'Sửa từ vựng' : 'Thêm từ vựng mới'}
                </h3>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 text-xs font-bold pr-2 -mr-2 pb-2">
                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Từ vựng (Tiếng Anh) <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Hacktivist"
                        value={newWordData.word}
                        onChange={(e) => setNewWordData({ ...newWordData, word: e.target.value })}
                        className="flex-1 bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all"
                      />
                      <button
                        type="button"
                        disabled={searchingAPI}
                        onClick={handleLookUp}
                        className="btn-3d-secondary px-3 text-xs shrink-0 flex items-center gap-1"
                      >
                        {searchingAPI ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        )}
                        <span>Dịch từ</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Phiên âm IPA <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: /ˈhæk.tɪ.vɪst/"
                        value={newWordData.ipa}
                        onChange={(e) => setNewWordData({ ...newWordData, ipa: e.target.value })}
                        className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Loại từ <span className="text-red-500">*</span></label>
                      <select
                        value={newWordData.type}
                        onChange={(e) => setNewWordData({ ...newWordData, type: e.target.value })}
                        className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all"
                      >
                        <option value="noun">Danh từ (noun)</option>
                        <option value="verb">Động từ (verb)</option>
                        <option value="adj">Tính từ (adj)</option>
                        <option value="adv">Trạng từ (adv)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Ý nghĩa (Tiếng Việt) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nhà hoạt động mạng, tin tặc xã hội"
                      value={newWordData.meaning}
                      onChange={(e) => setNewWordData({ ...newWordData, meaning: e.target.value })}
                      className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Chủ đề (Theme)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tech, General, AI, Security..."
                      value={newWordData.theme}
                      onChange={(e) => setNewWordData({ ...newWordData, theme: e.target.value })}
                      className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Ví dụ minh họa (Tiếng Anh)</label>
                    <textarea
                      rows="2"
                      placeholder="Ví dụ: He is a hacktivist who fights for internet freedom."
                      value={newWordData.example}
                      onChange={(e) => setNewWordData({ ...newWordData, example: e.target.value })}
                      className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Ảnh minh họa (Không bắt buộc)</label>
                    <div className="flex gap-2 mb-2 bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] p-1 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => {
                          setImageSourceType('upload');
                          setNewWordData((prev) => ({ ...prev, imageUrl: '' }));
                        }}
                        className={`px-3 py-1 rounded-lg transition-all text-[10px] uppercase font-black cursor-pointer ${imageSourceType === 'upload'
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                          }`}
                      >
                        Tải file lên
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageSourceType('url');
                          setNewWordData((prev) => ({ ...prev, imageUrl: '' }));
                        }}
                        className={`px-3 py-1 rounded-lg transition-all text-[10px] uppercase font-black cursor-pointer ${imageSourceType === 'url'
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                          }`}
                      >
                        Link ảnh
                      </button>
                    </div>

                    {imageSourceType === 'upload' ? (
                      <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2 text-[var(--color-text)] text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-[var(--color-primary)]/20 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/30 file:cursor-pointer"
                      />
                      {newWordData.imageUrl && (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[var(--color-surface-border)] mt-1">
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
                            <X className="w-3 h-3" />
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
                      className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                  )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)] shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); resetWordForm(); }}
                    className="flex-1 btn-3d-secondary py-2.5"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 btn-3d-primary py-2.5"
                  >
                    {formSubmitting ? 'Đang lưu...' : (editingWordId ? 'Cập nhật' : 'Lưu lại')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ──═ DIALOG MODAL: AI SINH TỪ ══── */}
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
                    Trí tuệ nhân tạo sinh từ mới
                  </h3>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                  Gemini AI sẽ lập tức tạo ra 10 từ vựng tiếng Anh theo chủ đề được lựa chọn kèm theo câu ví dụ, phát âm IPA và các câu hỏi kiểm tra tương ứng.
                </p>
              </div>

              {/* Preset list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 min-h-0 pb-2">
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Chủ đề gợi ý:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'Cyberpunk', label: 'Cyberpunk 🌐', color: '#0ea5e9' },
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
                          className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${isSelected
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                              : 'bg-[var(--color-bg)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-gray-300 dark:hover:border-slate-700'
                            }`}
                          style={{
                            borderColor: isSelected ? preset.color : undefined,
                          }}
                        >
                          <span className="truncate w-full">{preset.label}</span>
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
                    placeholder="Ví dụ: Space Travel, Animals, Cooking, Job Interview..."
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

export default Vocabulary;
