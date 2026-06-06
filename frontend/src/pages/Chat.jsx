import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Mic, MicOff, Trash2, Sparkles, BookOpen, Brain,
  MessageSquare, Globe, PenLine, Volume2, Copy, Check,
  Menu, Loader2
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
    color: '#1cb0f6',
    desc: 'Hỏi đáp tự do về tiếng Anh',
    prompt: (msg) =>
      `Bạn là Nexus AI, một trợ lý học tiếng Anh thân thiện.\nNgười dùng nói: "${msg}".\nHãy phản hồi bằng Tiếng Việt với giọng điệu vui vẻ, hiện đại và ngắn gọn. Nếu câu nói có tiếng Anh hoặc hỏi về tiếng Anh, hãy giải thích và sửa lỗi bằng tiếng Việt.`,
  },
  {
    id: 'grammar',
    label: 'Sửa Ngữ Pháp',
    icon: <PenLine className="w-4 h-4" />,
    color: '#a855f7',
    desc: 'Sửa lỗi câu tiếng Anh',
    prompt: (msg) =>
      `Bạn là chuyên gia ngữ pháp tiếng Anh. Người dùng muốn sửa lỗi câu sau: "${msg}".\nHãy:\n1. Phân tích lỗi ngữ pháp nếu có (bằng tiếng Việt)\n2. Đưa ra câu đúng (in đậm)\n3. Giải thích ngắn gọn tại sao\nPhong cách trả lời: ngắn gọn, dùng emoji phù hợp.`,
  },
  {
    id: 'translate',
    label: 'Dịch Thuật',
    icon: <Globe className="w-4 h-4" />,
    color: '#22c55e',
    desc: 'Dịch Anh ↔ Việt với giải thích',
    prompt: (msg) =>
      `Bạn là dịch giả tiếng Anh chuyên nghiệp.\nNhận đầu vào: "${msg}"\nTự động phát hiện ngôn ngữ và dịch sang ngôn ngữ còn lại.\nNếu là tiếng Anh → dịch sang tiếng Việt + giải thích nghĩa.\nNếu là tiếng Việt → dịch sang tiếng Anh + cho ví dụ.\nPhong cách: rõ ràng, dễ hiểu.`,
  },
  {
    id: 'vocabulary',
    label: 'Học Từ Vựng',
    icon: <BookOpen className="w-4 h-4" />,
    color: '#f59e0b',
    desc: 'Phân tích sâu một từ vựng',
    prompt: (msg) =>
      `Bạn là AI từ điển tiếng Anh thông minh. Người dùng muốn học từ: "${msg}".\nCung cấp:\n1. Nghĩa tiếng Việt (chính + phụ)\n2. Phiên âm IPA\n3. Ví dụ câu (3 câu ngắn)\n4. Từ đồng nghĩa & trái nghĩa\n5. Mẹo ghi nhớ (memory hack)\nFormat đẹp với emoji.`,
  },
  {
    id: 'conversation',
    label: 'Giao Tiếp',
    icon: <MessageSquare className="w-4 h-4" />,
    color: '#ef4444',
    desc: 'Hội thoại thực tế với AI',
    prompt: (msg) =>
      `Bạn là người bản ngữ tiếng Anh, đang hội thoại thực tế với người học.\nNgười dùng nói: "${msg}"\nHãy:\n1. Phản hồi tự nhiên bằng tiếng Anh (ngắn, 1-2 câu)\n2. Giải thích (tiếng Việt) từ/cụm từ hay bạn vừa dùng\n3. Gợi ý cách người dùng trả lời tiếp\nPhong cách: thân thiện.`,
  },
  {
    id: 'quiz',
    label: 'Đố Vui',
    icon: <Brain className="w-4 h-4" />,
    color: '#f97316',
    desc: 'AI tạo câu hỏi kiểm tra ngẫu nhiên',
    prompt: (msg) =>
      `Bạn là quiz master tiếng Anh.\nNgười dùng yêu cầu: "${msg}"\nTạo 3 câu hỏi trắc nghiệm thú vị về tiếng Anh:\n- Mỗi câu có 4 đáp án (A, B, C, D)\n- Đánh dấu đáp án đúng\n- Giải thích ngắn tại sao đúng\nFormat dễ đọc, có emoji.`,
  },
];

/* ── Quick prompts ───────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  { label: 'Giải thích "Break a leg"', icon: '🎭', color: '#1cb0f6' },
  { label: 'Từ vựng về IT', icon: '💻', color: '#a855f7' },
  { label: 'Sửa lỗi: "I am go to school"', icon: '✏️', color: '#ef4444' },
  { label: 'Dịch: Học đi đôi với hành', icon: '🔄', color: '#22c55e' },
  { label: 'Hội thoại: Phỏng vấn xin việc', icon: '💬', color: '#f59e0b' },
  { label: 'Tạo 3 câu trắc nghiệm từ vựng', icon: '⚡', color: '#f97316' },
];

/* ── Markdown renderer ───────────────────────────────────────────────────── */
const MarkdownMessage = ({ content }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="text-[var(--color-primary)] font-bold">{children}</strong>,
      em: ({ children }) => <em className="text-[var(--color-accent)] not-italic font-bold">{children}</em>,
      code: ({ inline, children }) =>
        inline ? (
          <code className="bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] text-[var(--color-primary)] px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-bold">
            {children}
          </code>
        ) : (
          <pre className="my-2 p-3 bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-xl overflow-x-auto text-[11px] font-mono text-[var(--color-text)]">
            <code>{children}</code>
          </pre>
        ),
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ── Message bubble ──────────────────────────────────────────────────────── */
const MessageBubble = ({ msg, onSpeak, activeMode }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const cfg = MODES.find((m) => m.id === activeMode) || MODES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-3 group`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div
          className="shrink-0 w-10 h-10 rounded-2xl border-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] flex items-center justify-center overflow-hidden shadow-sm select-none"
        >
          <div style={{ color: cfg.color }}>{cfg.icon}</div>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Role label for AI */}
        <div className={`flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ${isUser ? 'flex-row-reverse' : ''} select-none`}>
          {isUser ? (
            <span className="font-extrabold text-[var(--color-primary)]">BẠN</span>
          ) : (
            <span className="font-extrabold" style={{ color: cfg.color }}>NEXUS AI · {cfg.label}</span>
          )}
          <span className="opacity-80">{msg.time}</span>
          
          {!isUser && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={() => onSpeak(msg.text)}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-border)] transition-all cursor-pointer"
                title="Nghe phát âm"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-border)] transition-all cursor-pointer"
                title="Sao chép"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#58cc02]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl text-sm px-4 py-3 relative border-2 ${
            isUser
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white rounded-br-none shadow-sm'
              : 'bg-[var(--color-surface)] border-[var(--color-surface-border)] text-[var(--color-text)] rounded-bl-none'
          }`}
          style={{
            borderBottomWidth: isUser ? '4px' : undefined,
            borderBottomColor: isUser ? 'var(--color-primary-hover)' : undefined
          }}
        >
          {isUser ? <span className="font-medium text-[13px]">{msg.text}</span> : <MarkdownMessage content={msg.text} />}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 w-10 h-10 rounded-2xl border-2 border-[var(--color-primary)] bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center overflow-hidden shadow-sm select-none">
          {user && user.avatar && user.avatar !== 'default_cyber_avatar.png' ? (
            <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
          ) : (
            <span className="font-black text-[var(--color-primary)] text-sm">
              {user ? user.username.charAt(0).toUpperCase() : 'U'}
            </span>
          )}
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
      isWelcome: true,
      text: 'SYSTEM_WELCOME',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeMode, setActiveMode] = useState('general');
  const [showSidebar, setShowSidebar] = useState(true);
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
        isWelcome: true,
        text: 'SYSTEM_WELCOME',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSessionCount(0);
    toast.success('Đã dọn dẹp cuộc trò chuyện');
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
      toast.error('Lỗi nhận diện: ' + e.error);
    };
    recognition.onend = () => setIsListening(false);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 w-full flex-row overflow-hidden bg-[var(--color-surface)]"
    >
      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="shrink-0 border-r-2 border-[var(--color-surface-border)] flex flex-col overflow-hidden bg-[var(--color-bg)]/60"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] select-none">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
                <span className="font-black text-xs text-[var(--color-text)] uppercase tracking-wider">
                  Chế Độ AI Chat
                </span>
              </div>
              <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Tùy biến câu trả lời của AI</p>
            </div>

            {/* Mode list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {MODES.map((mode) => {
                const isActive = activeMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveMode(mode.id); inputRef.current?.focus(); }}
                    className={`w-full text-left p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      isActive ? 'font-bold' : 'border-transparent hover:bg-[var(--color-surface-border)]/50'
                    }`}
                    style={isActive ? {
                      background: mode.color + '12',
                      borderColor: mode.color,
                    } : {}}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="p-1.5 rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: mode.color }}
                      >
                        {mode.icon}
                      </div>
                      <span className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">{mode.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: mode.color }} />
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold pl-9">{mode.desc}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Session stats counter */}
            <div className="p-3 border-t-2 border-[var(--color-surface-border)] bg-[var(--color-bg)]/20">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] rounded-xl p-2 text-center shadow-sm">
                  <p className="text-[var(--color-primary)] font-black text-lg">{sessionCount}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Phản hồi</p>
                </div>
                <div className="bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] rounded-xl p-2 text-center shadow-sm">
                  <p className="text-[var(--color-accent)] font-black text-lg">{Math.max(0, messages.length - 1)}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">Tin nhắn</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ CHAT AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Chat header ── */}
        <div className="shrink-0 px-6 py-4 border-b-2 border-[var(--color-surface-border)] flex items-center justify-between bg-[var(--color-surface)] select-none z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="p-2 rounded-xl border-2 border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-[var(--color-surface-border)]"
                style={{ background: currentMode.color + '15', color: currentMode.color }}
              >
                {currentMode.icon}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#58cc02] rounded-full border-2 border-[var(--color-surface)] animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-base text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Nexus AI Trợ Lý
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58cc02]" />
                {currentMode.label} · {isTyping ? 'Đang soạn...' : 'Đang hoạt động'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClear}
            className="hidden md:flex btn-3d-secondary py-2 px-4 text-xs hover:text-[var(--color-danger)]"
          >
            <Trash2 className="w-4 h-4" /> Dọn dẹp
          </button>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--color-bg)]/30 custom-scrollbar">
          
          {/* Gamified Welcome Screen */}
          {messages.length === 1 && messages[0].isWelcome && (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center px-4 pt-10 pb-4">
              <div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-sm border-4"
                style={{ backgroundColor: currentMode.color + '15', borderColor: currentMode.color, color: currentMode.color }}
              >
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  {currentMode.icon}
                </motion.div>
              </div>
              
              <h2 className="text-2xl font-black text-[var(--color-text)] mb-2 uppercase tracking-wide">
                Bạn đã sẵn sàng?
              </h2>
              <p className="text-sm font-bold text-[var(--color-text-muted)] mb-8 max-w-md leading-relaxed">
                Hãy chọn một gợi ý bên dưới hoặc tự nhập câu hỏi để bắt đầu bài học.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {QUICK_PROMPTS.map((qp, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(qp.label)}
                    className="card-3d p-4 flex items-center gap-4 text-left hover:border-[var(--color-primary)] transition-all group cursor-pointer"
                  >
                    <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      {qp.icon}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] uppercase tracking-wide transition-colors">
                        {qp.label}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => {
            if (msg.isWelcome) return null;
            return (
              <MessageBubble
                key={i}
                msg={msg}
                onSpeak={speak}
                activeMode={activeMode}
              />
            );
          })}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-3"
              >
                <div
                  className="shrink-0 w-10 h-10 rounded-2xl border-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] flex items-center justify-center text-sm font-bold shadow-sm"
                  style={{ color: currentMode.color }}
                >
                  {currentMode.icon}
                </div>
                <div className="bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] px-4 py-3 rounded-2xl rounded-bl-none flex gap-1.5 items-center shadow-sm h-[44px]">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: currentMode.color }}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* ── Gamified Input Bar ── */}
        <div className="shrink-0 p-4 border-t-2 border-[var(--color-surface-border)] bg-[var(--color-surface)]">
          <div className="flex gap-3 items-end">
            {/* Voice button */}
            <button
              onClick={toggleListen}
              title={isListening ? 'Dừng phát âm' : 'Nhập bằng giọng nói'}
              className={`shrink-0 h-[52px] w-[52px] flex justify-center items-center rounded-2xl ${
                isListening ? 'btn-3d-danger animate-pulse' : 'btn-3d-secondary'
              }`}
              style={{ padding: 0 }}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Gamified Text area */}
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
                placeholder={isListening ? '🎙️ AI đang nghe...' : 'Hỏi Nexus AI điều gì đó... (Enter để gửi)'}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none leading-relaxed font-bold"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className={`shrink-0 h-[52px] w-[52px] flex justify-center items-center rounded-2xl ${
                input.trim() && !isTyping ? 'btn-3d-primary' : 'btn-3d-secondary opacity-60'
              }`}
              style={{ padding: 0 }}
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Chat;
