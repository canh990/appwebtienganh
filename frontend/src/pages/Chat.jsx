import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Mic, MicOff, Trash2, Sparkles, BookOpen, Brain,
  MessageSquare, ChevronRight, Zap, Volume2, Copy, Check,
  RotateCcw, Loader2, Globe, PenLine, Headphones, GraduationCap,
  X, Menu, ChevronDown
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

/* ── Socket ──────────────────────────────────────────────────────────────── */
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  transports: ['websocket', 'polling']
});

/* ── Speak ───────────────────────────────────────────────────────────────── */
const speak = (text, rate = 0.85) => {
  const cleaned = text.replace(/[*_`#>\-\[\]()]/g, '').substring(0, 300);
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleaned);
  u.lang = 'vi-VN';
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

/* ── Learning modes ──────────────────────────────────────────────────────── */
const MODES = [
  {
    id: 'general',
    label: 'Trợ Lý AI',
    icon: <Bot className="w-4 h-4" />,
    color: '#00f0ff',
    desc: 'Hỏi đáp tự do về tiếng Anh',
    prompt: (msg) =>
      `Bạn là Nexus AI, một trợ lý học tiếng Anh đến từ tương lai Cyberpunk.\nNgười dùng nói: "${msg}".\nHãy phản hồi bằng Tiếng Việt với giọng điệu đậm chất viễn tưởng/cyberpunk (ngắn gọn, ngầu, hiện đại). Nếu câu nói có tiếng Anh hoặc hỏi về tiếng Anh, hãy giải thích và sửa lỗi bằng tiếng Việt.`,
  },
  {
    id: 'grammar',
    label: 'Kiểm Tra Ngữ Pháp',
    icon: <PenLine className="w-4 h-4" />,
    color: '#a855f7',
    desc: 'Sửa lỗi ngữ pháp câu tiếng Anh',
    prompt: (msg) =>
      `Bạn là chuyên gia ngữ pháp tiếng Anh Cyberpunk. Người dùng muốn kiểm tra/sửa lỗi câu sau: "${msg}".\nHãy:\n1. Phân tích lỗi ngữ pháp nếu có (bằng tiếng Việt)\n2. Đưa ra câu đúng (in đậm)\n3. Giải thích ngắn gọn tại sao\nPhong cách trả lời: ngắn gọn, cyberpunk, dùng emoji phù hợp.`,
  },
  {
    id: 'translate',
    label: 'Dịch Thuật',
    icon: <Globe className="w-4 h-4" />,
    color: '#22c55e',
    desc: 'Dịch Anh ↔ Việt với giải thích',
    prompt: (msg) =>
      `Bạn là dịch giả AI Cyberpunk chuyên Anh-Việt.\nNhận đầu vào: "${msg}"\nTự động phát hiện ngôn ngữ và dịch sang ngôn ngữ còn lại.\nNếu là tiếng Anh → dịch sang tiếng Việt + giải thích sắc thái nghĩa.\nNếu là tiếng Việt → dịch sang tiếng Anh + cho ví dụ dùng trong câu.\nPhong cách: rõ ràng, kỹ thuật, cyberpunk.`,
  },
  {
    id: 'vocabulary',
    label: 'Học Từ Vựng',
    icon: <BookOpen className="w-4 h-4" />,
    color: '#f59e0b',
    desc: 'Phân tích sâu một từ tiếng Anh',
    prompt: (msg) =>
      `Bạn là AI từ điển Cyberpunk. Người dùng muốn học từ: "${msg}".\nCung cấp đầy đủ:\n1. Nghĩa tiếng Việt (chính + các nghĩa phụ)\n2. Phiên âm IPA\n3. Ví dụ câu (3 câu ngắn, chủ đề Cyberpunk/Tech)\n4. Từ đồng nghĩa & trái nghĩa\n5. Mẹo ghi nhớ (memory hack)\nFormat đẹp với emoji. Phong cách: chuyên gia, ngầu, futuristic.`,
  },
  {
    id: 'conversation',
    label: 'Luyện Giao Tiếp',
    icon: <MessageSquare className="w-4 h-4" />,
    color: '#ef4444',
    desc: 'Hội thoại thực tế với AI',
    prompt: (msg) =>
      `Bạn là người bản ngữ tiếng Anh Cyberpunk, đang hội thoại thực tế với người học.\nNgười dùng nói: "${msg}"\nHãy:\n1. Phản hồi tự nhiên bằng tiếng Anh (ngắn, 1-2 câu)\n2. Sau đó giải thích (tiếng Việt) những từ/cụm từ hay bạn vừa dùng\n3. Gợi ý cách người dùng có thể tiếp tục hội thoại\nPhong cách: thân thiện, tự nhiên, cyberpunk slang.`,
  },
  {
    id: 'quiz',
    label: 'Đố Vui',
    icon: <Brain className="w-4 h-4" />,
    color: '#f97316',
    desc: 'AI tạo câu hỏi kiểm tra ngẫu nhiên',
    prompt: (msg) =>
      `Bạn là quiz master AI Cyberpunk về tiếng Anh.\nNgười dùng yêu cầu: "${msg}"\nTạo 3 câu hỏi trắc nghiệm thú vị về tiếng Anh (chủ đề công nghệ/cyberpunk):\n- Mỗi câu có 4 đáp án (A, B, C, D)\n- Đánh dấu đáp án đúng\n- Giải thích ngắn tại sao đúng\nFormat dễ đọc, có emoji, phong cách futuristic.`,
  },
];

/* ── Quick prompts ───────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  { label: 'Giải thích "Hack the planet"', icon: '🌐' },
  { label: 'Từ vựng về AI & Machine Learning', icon: '🤖' },
  { label: 'Sửa lỗi: "I am go to school yesterday"', icon: '✏️' },
  { label: 'Dịch: Trí tuệ nhân tạo', icon: '🔄' },
  { label: 'Luyện hội thoại: Xin việc công nghệ', icon: '💬' },
  { label: 'Tạo 3 câu hỏi về Cyberpunk vocab', icon: '⚡' },
];

/* ── Markdown renderer ───────────────────────────────────────────────────── */
const MarkdownMessage = ({ content }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="text-[var(--color-primary)] font-bold">{children}</strong>,
      em: ({ children }) => <em className="text-[var(--color-accent)] not-italic font-medium">{children}</em>,
      ul: ({ children }) => <ul className="my-2 space-y-1 pl-3">{children}</ul>,
      ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>,
      li: ({ children }) => (
        <li className="flex gap-2 items-start text-sm">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
          <span>{children}</span>
        </li>
      ),
      code: ({ inline, children }) =>
        inline ? (
          <code className="bg-black/60 border border-[var(--color-primary)]/40 text-[var(--color-primary)] px-1.5 py-0.5 rounded text-[11px] font-mono">
            {children}
          </code>
        ) : (
          <pre className="my-2 p-3 bg-black/70 border border-white/10 rounded-lg overflow-x-auto text-[11px] font-mono text-gray-300">
            <code>{children}</code>
          </pre>
        ),
      h1: ({ children }) => <h1 className="text-base font-black text-[var(--color-primary)] mb-2 uppercase tracking-wider">{children}</h1>,
      h2: ({ children }) => <h2 className="text-sm font-bold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">{children}</h2>,
      h3: ({ children }) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-[var(--color-primary)] pl-3 my-2 text-gray-400 italic text-sm">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-white/10" />,
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ── Message bubble ──────────────────────────────────────────────────────── */
const MessageBubble = ({ msg, onSpeak, activeMode }) => {
  const [copied, setCopied] = useState(false);
  const cfg = MODES.find((m) => m.id === activeMode) || MODES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: msg.role === 'user' ? 10 : -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 group`}
    >
      {/* AI avatar */}
      {msg.role === 'ai' && (
        <div
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 border"
          style={{ background: cfg.color + '18', borderColor: cfg.color + '40' }}
        >
          <div style={{ color: cfg.color }}>{cfg.icon}</div>
        </div>
      )}

      <div className="flex flex-col gap-1 max-w-[78%]">
        {/* Role label for AI */}
        {msg.role === 'ai' && (
          <span className="text-[10px] font-mono ml-1" style={{ color: cfg.color }}>
            Nexus AI · {cfg.label}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl text-sm font-mono relative ${
            msg.role === 'user'
              ? 'bg-[var(--color-primary)] text-black px-4 py-3 rounded-br-sm font-medium shadow-[0_0_20px_rgba(0,240,255,0.2)]'
              : 'bg-[#0a0a0a]/90 border border-white/8 text-gray-200 px-4 py-3 rounded-bl-sm'
          }`}
        >
          {msg.role === 'ai' ? <MarkdownMessage content={msg.text} /> : <span>{msg.text}</span>}

          {/* Timestamp */}
          <span className={`block text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-black/50 text-right' : 'text-gray-600'}`}>
            {msg.time}
          </span>
        </div>

        {/* Action buttons for AI messages */}
        {msg.role === 'ai' && (
          <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSpeak(msg.text)}
              className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-all"
              title="Nghe"
            >
              <Volume2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-all"
              title="Sao chép"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* User avatar */}
      {msg.role === 'user' && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center mb-0.5 text-[var(--color-primary)] text-xs font-black">
          U
        </div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CHAT PAGE
═══════════════════════════════════════════════════════════════════════════ */
const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: '**Nexus AI v2.0 Online** 🤖\n\nĐường liên kết nơ-ron đã được thiết lập. Chào mừng chiến binh số!\n\nTôi là trợ lý học tiếng Anh AI của bạn. Chọn chế độ học phù hợp bên trái, hoặc bắt đầu gõ câu hỏi ngay bây giờ.\n\n> *"The net is vast and infinite."* — Ghost in the Shell',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeMode, setActiveMode] = useState('general');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const currentMode = MODES.find((m) => m.id === activeMode) || MODES[0];

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Socket setup */
  useEffect(() => {
    socket.on('bot_typing', (typing) => setIsTyping(typing));
    socket.on('bot_reply', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: data.text,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setSessionCount((c) => c + 1);
    });
    return () => {
      socket.off('bot_typing');
      socket.off('bot_reply');
    };
  }, []);

  /* Focus on load */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  /* Send message */
  const handleSend = useCallback((overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || isTyping) return;

    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: 'user', text, time: now }]);
    setInput('');

    const prompt = currentMode.prompt(text);
    socket.emit('user_message', {
      message: prompt,
      userId: user?.id || null,
    });
  }, [input, isTyping, currentMode, user]);

  /* Clear conversation */
  const handleClear = () => {
    setMessages([
      {
        role: 'ai',
        text: '**Bộ nhớ đệm đã được xóa sạch.** Phiên kết nối mới bắt đầu.\n\nReady to uplink! 🔄',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSessionCount(0);
    toast.success('Đã xóa lịch sử cuộc trò chuyện');
  };

  /* Voice input */
  const toggleListen = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Trình duyệt không hỗ trợ nhận diện giọng nói.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.start();
    setIsListening(true);
    recognition.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      toast.error('Lỗi giọng nói: ' + e.error);
    };
    recognition.onend = () => setIsListening(false);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex h-[calc(100vh-120px)] max-w-7xl mx-auto gap-0 overflow-hidden rounded-2xl border border-white/8"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}
    >
      {/* ═══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="shrink-0 border-r border-white/8 flex flex-col overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-white/8">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
                <span className="font-mono font-black text-xs text-[var(--color-primary)] uppercase tracking-widest">
                  Chế Độ Học
                </span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono">Chọn để tùy chỉnh AI response</p>
            </div>

            {/* Mode list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
              {MODES.map((mode) => {
                const isActive = activeMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setActiveMode(mode.id); inputRef.current?.focus(); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      isActive ? 'border-opacity-60 font-bold' : 'border-white/5 hover:border-white/15 hover:bg-white/3'
                    }`}
                    style={isActive ? {
                      background: mode.color + '15',
                      borderColor: mode.color + '60',
                      boxShadow: `0 0 15px ${mode.color}10`,
                    } : {}}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ background: mode.color + '20', color: mode.color }}
                      >
                        {mode.icon}
                      </div>
                      <span className="font-mono text-xs font-bold text-white">{mode.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: mode.color }} />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono pl-8">{mode.desc}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Quick prompts */}
            <div className="p-3 border-t border-white/8">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2 px-1">
                ⚡ Gợi ý nhanh
              </p>
              <div className="space-y-1">
                {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.label)}
                    disabled={isTyping}
                    className="w-full text-left p-2 rounded-lg text-[10px] font-mono text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 border border-transparent hover:border-[var(--color-primary)]/20 transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <span>{qp.icon}</span>
                    <span className="truncate">{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Session stats */}
            <div className="p-3 border-t border-white/8">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/50 border border-white/5 rounded-lg p-2 text-center">
                  <p className="text-[var(--color-primary)] font-black font-mono text-lg">{sessionCount}</p>
                  <p className="text-[9px] text-gray-600 font-mono uppercase">Phản hồi</p>
                </div>
                <div className="bg-black/50 border border-white/5 rounded-lg p-2 text-center">
                  <p className="text-[var(--color-accent)] font-black font-mono text-lg">{messages.length - 1}</p>
                  <p className="text-[9px] text-gray-600 font-mono uppercase">Tin nhắn</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ CHAT AREA ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Chat header ── */}
        <div
          className="shrink-0 px-4 py-3 border-b border-white/8 flex items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setShowSidebar((s) => !s)}
            className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-all shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Bot status */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border"
                style={{ background: currentMode.color + '18', borderColor: currentMode.color + '40' }}
              >
                <div style={{ color: currentMode.color }}>{currentMode.icon}</div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-black" />
            </div>
            <div className="min-w-0">
              <h1 className="font-mono font-black text-sm text-[var(--color-primary)] uppercase tracking-widest">
                Nexus AI
              </h1>
              <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                {currentMode.label} · {isTyping ? 'Đang xử lý...' : 'Sẵn sàng'}
              </p>
            </div>
          </div>

          {/* Mode quick-switch (mobile) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowModeDropdown((s) => !s)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all"
              style={{
                background: currentMode.color + '15',
                borderColor: currentMode.color + '40',
                color: currentMode.color,
              }}
            >
              {currentMode.icon}
              <span className="hidden md:inline">{currentMode.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-10 w-52 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 p-1 overflow-hidden"
                >
                  {MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => { setActiveMode(mode.id); setShowModeDropdown(false); inputRef.current?.focus(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono hover:bg-white/5 transition-colors text-left"
                      style={{ color: activeMode === mode.id ? mode.color : '#9ca3af' }}
                    >
                      <span style={{ color: mode.color }}>{mode.icon}</span>
                      {mode.label}
                      {activeMode === mode.id && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear */}
          <button
            onClick={handleClear}
            title="Xóa cuộc trò chuyện"
            className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-[var(--color-secondary)] hover:border-[var(--color-secondary)]/40 transition-all shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* ── Messages area ── */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          onClick={() => setShowModeDropdown(false)}
        >
          {/* Welcome banner */}
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4"
            >
              {QUICK_PROMPTS.map((qp, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSend(qp.label)}
                  className="p-3 rounded-xl border border-white/8 bg-black/40 text-left hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5 transition-all group"
                >
                  <span className="text-xl block mb-1">{qp.icon}</span>
                  <span className="text-[11px] font-mono text-gray-400 group-hover:text-white transition-colors line-clamp-2">
                    {qp.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onSpeak={speak}
              activeMode={activeMode}
            />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-2"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border"
                  style={{ background: currentMode.color + '18', borderColor: currentMode.color + '40', color: currentMode.color }}
                >
                  {currentMode.icon}
                </div>
                <div className="bg-[#0a0a0a]/90 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: currentMode.color }}
                      animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay }}
                    />
                  ))}
                  <span className="text-[10px] text-gray-600 font-mono ml-1">Nexus AI đang nghĩ...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 p-4 border-t border-white/8" style={{ background: 'rgba(0,0,0,0.6)' }}>
          {/* Mode indicator strip */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border"
              style={{ background: currentMode.color + '15', borderColor: currentMode.color + '40', color: currentMode.color }}
            >
              {currentMode.icon}
              <span>{currentMode.label}</span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">{currentMode.desc}</span>
          </div>

          <div className="flex gap-2 items-end">
            {/* Voice button */}
            <button
              onClick={toggleListen}
              title={isListening ? 'Dừng' : 'Nhập bằng giọng nói'}
              className={`shrink-0 p-3 rounded-xl border transition-all duration-200 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                  : 'bg-white/5 text-gray-500 border-white/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text area */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping}
                placeholder={
                  isListening
                    ? '🎙️ Đang nghe giọng nói...'
                    : `Nhắn tin với Nexus AI (${currentMode.label})... Enter để gửi`
                }
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]/60 font-mono transition-colors resize-none leading-relaxed disabled:opacity-60"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="shrink-0 p-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: input.trim() && !isTyping ? currentMode.color : 'rgba(255,255,255,0.05)',
                color: input.trim() && !isTyping ? '#000' : '#6b7280',
              }}
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[10px] text-gray-700 font-mono text-center mt-2">
            Nexus AI · Powered by Google Gemini · Enter gửi · Shift+Enter xuống dòng
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Chat;
