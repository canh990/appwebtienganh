import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';
import toast from 'react-hot-toast';
import { Send, Users, Activity, Sparkles, Loader2, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/* ── Socket ──────────────────────────────────────────────────────────────── */
const socket = io((import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000') + '/community', {
  transports: ['websocket', 'polling']
});

/* ── Markdown renderer ───────────────────────────────────────────────────── */
const MarkdownMessage = ({ content }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="text-[var(--color-primary)] font-bold">{children}</strong>,
      em: ({ children }) => <em className="text-[var(--color-accent)] not-italic font-medium">{children}</em>,
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
    }}
  >
    {content}
  </ReactMarkdown>
);

const CommunityChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Socket setup */
  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      if (user) {
        socket.emit('join_community', { userId: user.id });
      }
    }

    const onConnect = () => {
      setIsConnected(true);
      if (user) {
        socket.emit('join_community', { userId: user.id });
      }
    };

    const onDisconnect = () => setIsConnected(false);
    const onHistory = (data) => setMessages(data.messages || []);
    const onNewMessage = (msg) => setMessages((prev) => [...prev, msg]);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('community_history', onHistory);
    socket.on('new_community_message', onNewMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('community_history', onHistory);
      socket.off('new_community_message', onNewMessage);
    };
  }, [user]);

  /* Focus on load */
  useEffect(() => {
    if (user) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [user]);

  /* Send message */
  const handleSend = useCallback(() => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để chat!');
      return;
    }
    
    const text = input.trim();
    if (!text) return;

    // Emit via socket
    socket.emit('send_message_community', {
      text,
      userId: user.id
    });
    
    setInput('');
  }, [input, user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold font-mono text-gray-400">Yêu cầu đăng nhập</h2>
        <p className="text-gray-500 mt-2">Vui lòng đăng nhập để tham gia phòng chat cộng đồng.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex h-[calc(100vh-120px)] max-w-5xl mx-auto flex-col overflow-hidden rounded-2xl border border-[var(--color-primary)]/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}
    >
      {/* ── Chat header ── */}
      <div className="shrink-0 px-6 py-4 border-b border-[var(--color-primary)]/20 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40">
              <Users className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            {isConnected && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="font-mono font-black text-lg text-white uppercase tracking-widest flex items-center gap-2">
              Khu Vực Chung <span className="text-[var(--color-primary)]">#Global</span>
            </h1>
            <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-green-400" />
              {isConnected ? 'Mạng nơ-ron ổn định' : 'Đang kết nối...'}
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-xs font-mono text-gray-300">Hãy giao tiếp lịch sự!</span>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && isConnected && (
          <div className="text-center text-gray-500 font-mono mt-20">
            <p>Chưa có tin nhắn nào.</p>
            <p className="text-xs mt-2">Hãy là người đầu tiên phát tín hiệu!</p>
          </div>
        )}
        
        {messages.map((msg, i) => {
          const isMe = msg.user.id === user.id;
          
          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-3 group`}
            >
              {/* Avatar (Other) */}
              {!isMe && (
                <div className="shrink-0 w-10 h-10 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden">
                  <span className="font-bold text-gray-400 text-sm">
                    {msg.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Username & Level */}
                <div className={`flex items-center gap-2 text-[10px] font-mono ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-400 font-bold">{msg.user.username}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-800 text-[var(--color-accent)] border border-gray-700">
                    Lv.{msg.user.level || 1}
                  </span>
                  <span className="text-gray-600">
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl text-sm font-mono px-4 py-3 relative ${
                    isMe
                      ? 'bg-[var(--color-primary)] text-black rounded-br-sm shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'bg-[#151515] border border-white/10 text-gray-200 rounded-bl-sm'
                  }`}
                >
                  <MarkdownMessage content={msg.text} />
                </div>
              </div>

              {/* Avatar (Me) */}
              {isMe && (
                <div className="shrink-0 w-10 h-10 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/20 flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                  <span className="font-bold text-[var(--color-primary)] text-sm">
                    {msg.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 p-4 border-t border-[var(--color-primary)]/20" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <div className="flex gap-3 items-end">
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
              placeholder="Nhập tín hiệu truyền đi... (Enter để gửi)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)]/60 font-mono transition-colors resize-none leading-relaxed"
              style={{ minHeight: '52px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !isConnected}
            className="shrink-0 p-3.5 rounded-xl font-bold transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
            style={{
              background: input.trim() && isConnected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              color: input.trim() && isConnected ? '#000' : '#6b7280',
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CommunityChat;
