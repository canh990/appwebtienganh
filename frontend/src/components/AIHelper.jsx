import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Mic, MicOff, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

/* ── Markdown component cho tin nhắn AI ──────────────────────────────────── */
const MarkdownMessage = ({ content }) => (
  <ReactMarkdown
    components={{
      // Paragraph: remove extra margin
      p: ({ children }) => (
        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
      ),
      // Strong / bold
      strong: ({ children }) => (
        <strong className="text-[var(--color-primary)] font-bold">{children}</strong>
      ),
      // Emphasis / italic
      em: ({ children }) => (
        <em className="text-[var(--color-accent)] not-italic font-medium">{children}</em>
      ),
      // Unordered list
      ul: ({ children }) => (
        <ul className="my-2 space-y-1 pl-3">{children}</ul>
      ),
      // Ordered list
      ol: ({ children }) => (
        <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>
      ),
      // List item
      li: ({ children }) => (
        <li className="flex gap-2 items-start text-sm">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
          <span>{children}</span>
        </li>
      ),
      // Inline code
      code: ({ inline, children }) =>
        inline ? (
          <code className="bg-black/60 border border-[var(--color-primary)]/40 text-[var(--color-primary)] px-1.5 py-0.5 rounded text-[11px] font-mono">
            {children}
          </code>
        ) : (
          <pre className="my-2 p-3 bg-black/70 border border-[var(--color-dark-surface-border)] rounded-lg overflow-x-auto text-[11px] font-mono text-gray-300">
            <code>{children}</code>
          </pre>
        ),
      // Headings
      h1: ({ children }) => (
        <h1 className="text-base font-black text-[var(--color-primary)] mb-2 uppercase tracking-wider">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-sm font-bold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-bold text-white mb-1">{children}</h3>
      ),
      // Blockquote
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-[var(--color-primary)] pl-3 my-2 text-gray-400 italic text-sm">
          {children}
        </blockquote>
      ),
      // Horizontal rule
      hr: () => (
        <hr className="my-3 border-[var(--color-dark-surface-border)]" />
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ── Main AIHelper component ─────────────────────────────────────────────── */
const AIHelper = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: '**Nexus AI Online** 🤖\n\nĐang khởi tạo liên kết nơ-ron... Xin chào chiến binh số! Tôi có thể giúp gì cho quá trình học ngôn ngữ của bạn hôm nay?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    socket.on('bot_typing', (typing) => setIsTyping(typing));
    socket.on('bot_reply', (data) => {
      setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
    });
    return () => {
      socket.off('bot_typing');
      socket.off('bot_reply');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    socket.emit('user_message', {
      message: userMsg,
      userId: user?.id || null
    });
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'ai',
        text: '**Bộ nhớ đã được xóa sạch.** Phiên làm việc mới bắt đầu. Tôi có thể giúp gì cho bạn?'
      }
    ]);
  };

  const toggleListen = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        toast.error('Lỗi nhận diện giọng nói: ' + event.error);
      };
      recognition.onend = () => setIsListening(false);
    }
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        id="ai-helper-trigger"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full glass-panel flex items-center justify-center z-50 group hover:bg-[var(--color-primary)] transition-all duration-300"
        style={{ animation: 'var(--animate-float)' }}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bot className="w-7 h-7 text-[var(--color-primary)] group-hover:text-black transition-colors" />
        <span className="absolute w-full h-full rounded-full border border-[var(--color-primary)] animate-ping opacity-40" />
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-helper-panel"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-28 right-8 w-[360px] md:w-[440px] glass-panel flex flex-col overflow-hidden z-50 border border-[var(--color-primary)]/50 shadow-[0_0_40px_rgba(0,240,255,0.15)]"
            style={{ height: '560px' }}
          >
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-[var(--color-primary)]/15 to-transparent p-4 border-b border-[var(--color-primary)]/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Animated bot icon */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[var(--color-primary)] blur-md opacity-30" />
                  <Bot className="w-5 h-5 text-[var(--color-primary)] relative z-10" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-[var(--color-primary)] tracking-widest uppercase text-sm leading-none">
                    Nexus AI
                  </h3>
                  <p className="text-[10px] text-green-400 font-mono flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    ONLINE · Học tiếng Anh Cyberpunk
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  title="Xóa cuộc trò chuyện"
                  className="text-gray-500 hover:text-[var(--color-secondary)] transition-colors p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/50">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {/* AI avatar dot */}
                  {msg.role === 'ai' && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 flex items-center justify-center mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl text-sm font-mono ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-primary)] text-black px-4 py-2.5 rounded-br-sm shadow-[0_0_12px_rgba(0,240,255,0.25)] font-medium'
                        : 'bg-[#111]/90 border border-white/8 text-gray-200 px-4 py-3 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'ai' ? (
                      <MarkdownMessage content={msg.text} />
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-end gap-2 justify-start"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  </div>
                  <div className="bg-[#111]/90 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center h-10">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-[var(--color-primary)] rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 p-3 border-t border-white/8 bg-[#060606]">
              <div className="flex gap-2 items-center">
                {/* Mic button */}
                <button
                  onClick={toggleListen}
                  title={isListening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'}
                  className={`shrink-0 p-2.5 rounded-xl border transition-all duration-200 ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                      : 'bg-white/5 text-gray-500 border-white/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={isListening ? '🎙️ Đang nghe...' : 'Nhắn tin với Nexus AI...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]/60 font-mono transition-colors"
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="shrink-0 bg-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed text-black p-2.5 rounded-xl hover:bg-white transition-all duration-200 hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-700 font-mono text-center mt-2">
                Nexus AI · Powered by Google Gemini
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIHelper;
