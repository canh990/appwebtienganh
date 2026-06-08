import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';
import toast from 'react-hot-toast';
import { Send, Users, Activity, Sparkles, Shield } from 'lucide-react';
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

const MOCK_ONLINE_USERS = [
  { username: 'Alex_owl', level: 12, status: 'online' },
  { username: 'Sophia_study', level: 8, status: 'online' },
  { username: 'Justin_Code', level: 15, status: 'online' },
  { username: 'Emily_En', level: 5, status: 'idle' },
  { username: 'DuoOwl', level: 99, status: 'online' },
];

const getAvatarGradient = (lvl) => {
  const l = lvl || 1;
  if (l >= 20) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white border-yellow-300';
  if (l >= 11) return 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white border-sky-300';
  if (l >= 6) return 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border-emerald-300';
  return 'bg-gradient-to-br from-slate-400 to-slate-500 text-white border-slate-300';
};

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

  /* Live chat simulation */
  useEffect(() => {
    const chatTemplates = [
      "Hôm nay mình vừa học xong chủ đề Cyberpunk, từ 'Hacktivist' hay thật!",
      "Mọi người có mẹo nào để nhớ phiên âm IPA nhanh không? 💡",
      "Chào cả nhà! Chúc mọi người học tập vui vẻ nhé! 🦉",
      "Mình vừa hoàn thành chuỗi 5 ngày streak, cố gắng đạt 7 ngày nào! 🔥",
      "Đề trắc nghiệm hôm nay hơi khó ở phần nghe và viết, cần luyện tập thêm 🎧",
      "Có ai muốn đua top BXH tuần này không? 🥇",
      "Từ mới 'Security' viết là /sɪˈkjʊə.rə.ti/ đúng không cả nhà?",
    ];

    const interval = setInterval(() => {
      if (!isConnected) return;
      const mockUser = MOCK_ONLINE_USERS[Math.floor(Math.random() * MOCK_ONLINE_USERS.length)];
      const text = chatTemplates[Math.floor(Math.random() * chatTemplates.length)];
      
      const newSimulatedMsg = {
        id: `sim-${Date.now()}`,
        text,
        timestamp: new Date().toISOString(),
        user: {
          id: `user-${mockUser.username}`,
          username: mockUser.username,
          level: mockUser.level,
        }
      };
      
      setMessages((prev) => [...prev, newSimulatedMsg]);
    }, 45000); // Simulated message every 45 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

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
        <Shield className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-2xl font-black text-[var(--color-text)] uppercase tracking-wide">Yêu cầu đăng nhập</h2>
        <p className="text-[var(--color-text-muted)] font-bold mt-2">Vui lòng đăng nhập để tham gia phòng chat cộng đồng.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 w-full flex-col overflow-hidden bg-[var(--color-surface)]"
    >
      {/* ── Chat header ── */}
      <div className="shrink-0 px-4 py-3 md:px-6 md:py-4 border-b-2 border-[var(--color-surface-border)] flex items-center justify-between bg-[var(--color-surface)] select-none">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center bg-[#1cb0f6] border-2 border-[#1899d6] text-white shadow-sm">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-sm sm:text-base text-[var(--color-text)] uppercase tracking-wider truncate whitespace-nowrap">
              Cộng Đồng <span className="text-[var(--color-primary)]">#Global</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold flex items-center gap-1.5 mt-0.5 truncate whitespace-nowrap">
              <Activity className="w-3.5 h-3.5 text-[#58cc02] shrink-0" />
              <span>{isConnected ? 'Đang trực tuyến' : 'Đang kết nối...'}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] shadow-sm shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">Giao tiếp lịch sự!</span>
        </div>
      </div>

      {/* ── Main Chat Area Layout (horizontal flex) ── */}
      <div className="flex-grow flex overflow-hidden min-h-0">
        
        {/* Left/Center: Messages area & Input bar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[var(--color-bg)]/30 custom-scrollbar">
            {messages.length === 0 && isConnected && (
              <div className="text-center text-[var(--color-text-muted)] font-bold mt-20 select-none">
                <p className="text-lg">Chưa có tin nhắn nào.</p>
                <p className="text-xs mt-2 uppercase tracking-wider">Hãy là người đầu tiên phát tín hiệu chào mọi người!</p>
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
                    <div className={`shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-sm select-none ${getAvatarGradient(msg.user.level)}`}>
                      {msg.user.avatar && msg.user.avatar !== 'default_cyber_avatar.png' ? (
                        <img src={msg.user.avatar} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <span className="font-black text-sm uppercase">
                          {msg.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Username & Level */}
                    <div className={`flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ${isMe ? 'flex-row-reverse' : ''} select-none`}>
                      <span className="text-[var(--color-text)] font-extrabold">{msg.user.username}</span>
                      <span className="px-1.5 py-0.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)] border-2 border-[var(--color-surface-border)] font-black shadow-sm">
                        Lv.{msg.user.level || 1}
                      </span>
                      <span className="opacity-80">
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl text-sm px-4 py-3 relative border-2 ${
                        isMe
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white rounded-br-none shadow-sm'
                          : 'bg-[var(--color-surface)] border-[var(--color-surface-border)] text-[var(--color-text)] rounded-bl-none shadow-sm hover:shadow-md'
                      }`}
                      style={{
                        borderBottomWidth: isMe ? '4px' : '2px',
                        borderBottomColor: isMe ? 'var(--color-primary-hover)' : 'var(--color-surface-border)'
                      }}
                    >
                      <MarkdownMessage content={msg.text} />
                      
                      {/* Floating reactions bar on hover */}
                      <div className={`absolute -top-3 ${isMe ? 'left-2' : 'right-2'} bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-full px-2 py-0.5 shadow-sm hidden group-hover:flex items-center gap-1.5 z-10 select-none`}>
                        <button onClick={() => toast.success('Đã thả cảm xúc 👍')} className="hover:scale-125 transition-transform text-[11px] cursor-pointer">👍</button>
                        <button onClick={() => toast.success('Đã thả cảm xúc ❤️')} className="hover:scale-125 transition-transform text-[11px] cursor-pointer">❤️</button>
                        <button onClick={() => toast.success('Đã thả cảm xúc 😂')} className="hover:scale-125 transition-transform text-[11px] cursor-pointer">😂</button>
                        <button onClick={() => toast.success('Đã thả cảm xúc 😮')} className="hover:scale-125 transition-transform text-[11px] cursor-pointer">😮</button>
                      </div>
                    </div>
                  </div>

                  {/* Avatar (Me) */}
                  {isMe && (
                    <div className={`shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-sm select-none ${getAvatarGradient(user.level)}`}>
                      {user.avatar && user.avatar !== 'default_cyber_avatar.png' ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <span className="font-black text-sm uppercase">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Gamified Input bar */}
          <div className="shrink-0 p-4 border-t-2 border-[var(--color-surface-border)] bg-[var(--color-surface)]">
            <div className="flex gap-3 items-center">
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
                  placeholder="Nhắn gửi cộng đồng... (Enter để gửi)"
                  className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none leading-relaxed font-bold shadow-inner"
                  style={{ minHeight: '52px', maxHeight: '120px' }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || !isConnected}
                className={`shrink-0 h-[52px] w-[52px] flex justify-center items-center rounded-2xl ${
                  input.trim() && isConnected ? 'btn-3d-primary' : 'btn-3d-secondary opacity-60'
                }`}
                style={{ padding: 0 }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sidebar (Online Members) */}
        <div className="hidden lg:flex w-64 border-l-2 border-[var(--color-surface-border)] flex-col bg-[var(--color-surface)] shrink-0 select-none">
          <div className="p-4 border-b border-[var(--color-surface-border)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse" />
              <span>Thành viên trực tuyến ({MOCK_ONLINE_USERS.length + 1})</span>
            </h3>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {/* Me */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-[var(--color-primary)]/20">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 overflow-hidden ${getAvatarGradient(user.level)}`}>
                {user.avatar && user.avatar !== 'default_cyber_avatar.png' ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-xs text-[var(--color-primary)] truncate flex items-center gap-1">
                  {user.username}
                  <span className="text-[7px] bg-[var(--color-primary)] text-white px-1 py-0.5 rounded font-black uppercase tracking-wider scale-90">Bạn</span>
                </p>
                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">Cấp {user.level || 1} · Online</p>
              </div>
            </div>

            {/* Mock Users */}
            {MOCK_ONLINE_USERS.map((u) => (
              <div key={u.username} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-bg)] transition-colors">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${getAvatarGradient(u.level)}`}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-[var(--color-text)] truncate">{u.username}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)] font-bold flex items-center gap-1">
                    <span>Cấp {u.level}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span className={u.status === 'online' ? 'text-[#58cc02]' : 'text-amber-500'}>
                      {u.status === 'online' ? 'Online' : 'Vắng mặt'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default CommunityChat;
