import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Mic, MicOff, Trash2, Sparkles } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

/* ── Markdown component ──────────────────────────────────────────────────── */
const MarkdownMessage = ({ content }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>,
      strong: ({ children }) => <strong className="font-bold text-[var(--color-primary)]">{children}</strong>,
      em: ({ children }) => <em className="italic font-medium">{children}</em>,
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
          <code className="bg-[var(--color-surface-border)]/50 text-[var(--color-primary)] px-1.5 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        ) : (
          <pre className="my-2 p-3 bg-[var(--color-surface-border)]/30 rounded-xl overflow-x-auto text-xs font-mono text-[var(--color-text)]">
            <code>{children}</code>
          </pre>
        ),
      h1: ({ children }) => <h1 className="text-base font-bold text-[var(--color-primary)] mb-2 tracking-tight">{children}</h1>,
      h2: ({ children }) => <h2 className="text-sm font-bold text-[var(--color-text)] mb-1.5">{children}</h2>,
      h3: ({ children }) => <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-1">{children}</h3>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-[var(--color-primary)]/50 pl-3 my-2 italic text-sm text-[var(--color-text-muted)]">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-[var(--color-surface-border)]" />,
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ── AIHelper ────────────────────────────────────────────────────────────── */
const AIHelper = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: '👋 **CyberLingo AI**\n\nXin chào! Tôi có thể giúp gì cho quá trình học ngôn ngữ của bạn hôm nay?'
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

  /* ── Lắng nghe quiz answer banner ── */
  useEffect(() => {
    const handler = (e) => setBannerVisible(e.detail?.visible ?? false);
    window.addEventListener('quiz:answerBanner', handler);
    return () => window.removeEventListener('quiz:answerBanner', handler);
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(!isOpen);
  const clearChat = () => {
    setMessages([{
      role: 'ai',
      text: 'Đã dọn dẹp bộ nhớ. Chúng ta bắt đầu lại nhé!'
    }]);
    toast.success('Đã xóa lịch sử chat');
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    socket.emit('user_message', { userId: user?.id || 'guest', message: input.trim() });
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => setInput(prev => prev + ' ' + e.results[0][0].transcript);
    recognition.onerror = () => { setIsListening(false); toast.error('Lỗi nhận diện giọng nói'); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <>
      {/* Floating Toggle Button — dùng CSS transition thuần cho bottom */}
      <button
        onClick={toggleOpen}
        className="fixed right-5 z-[9999] flex items-center justify-center cursor-pointer"
        style={{
          bottom: bannerVisible ? '150px' : '24px',
          transition: 'bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 4px 16px rgba(99,102,241,0.45))',
          border: 'none',
          background: 'none',
          padding: 0,
        }}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span
            className="absolute rounded-full animate-ping"
            style={{
              width: '56px', height: '56px',
              background: 'var(--color-primary)',
              opacity: 0.25,
            }}
          />
        )}
        {/* Button circle */}
        <span
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            boxShadow: isOpen
              ? '0 0 0 3px var(--color-primary), 0 8px 24px rgba(99,102,241,0.4)'
              : '0 4px 20px rgba(99,102,241,0.5)',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span key="close"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <X className="w-6 h-6" />
              </motion.span>
            ) : (
              <motion.span key="bot"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Bot className="w-7 h-7" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] h-[550px] max-h-[80vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--color-surface-border)] bg-[var(--color-surface)]/80 backdrop-blur-md flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] p-0.5 shadow-sm">
                  <div className="w-full h-full bg-[var(--color-surface)] rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text)] leading-tight">CyberLingo AI</h3>
                  <p className="text-[10px] text-[var(--color-primary)] font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                    Đang hoạt động
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xóa lịch sử">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={toggleOpen} className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-border)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[var(--color-bg)]/50 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  {msg.role === 'ai' && idx > 0 && messages[idx - 1]?.role !== 'ai' && (
                    <span className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1 ml-1">AI Assistant</span>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-primary)] text-white rounded-tr-sm'
                        : 'bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-[var(--color-text)] rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      <MarkdownMessage content={msg.text} />
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs font-medium p-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-2xl rounded-tl-sm w-max shadow-sm">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-surface-border)] shrink-0">
              <div className="relative flex items-center bg-[var(--color-bg)] rounded-xl border border-[var(--color-surface-border)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1 bg-transparent text-[var(--color-text)] text-sm p-3 max-h-32 focus:outline-none resize-none custom-scrollbar"
                  rows={1}
                />
                <div className="flex items-center gap-1 pr-2">
                  <button
                    onClick={toggleListen}
                    className={`p-2 rounded-lg transition-colors ${
                      isListening ? 'text-[var(--color-danger)] bg-[var(--color-danger)]/10 animate-pulse' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-border)]/50'
                    }`}
                    title="Nhập bằng giọng nói"
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIHelper;
