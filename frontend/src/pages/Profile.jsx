import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Flame, Cpu, Star, Zap, Camera, Upload, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { pageVariants } from '../animations/variants';
import { updateProfile } from '../services/authService';
import toast from 'react-hot-toast';

const PRESETS = [
  { id: 'owl', label: 'Cú Đa Trí', emoji: '🦉', start: '#1cb0f6', end: '#0079b8' },
  { id: 'bot', label: 'Cyber Bot', emoji: '🤖', start: '#a855f7', end: '#6b21a8' },
  { id: 'fox', label: 'Cáo Lanh Lợi', emoji: '🦊', start: '#ff9600', end: '#c2410c' },
  { id: 'lion', label: 'Sư Tử Dũng Mãnh', emoji: '🦁', start: '#facc15', end: '#a16207' },
  { id: 'dragon', label: 'Rồng Năng Lượng', emoji: '🐲', start: '#22c55e', end: '#15803d' },
  { id: 'astronaut', label: 'Phi Hành Gia', emoji: '🧑‍🚀', start: '#06b6d4', end: '#0891b2' },
];

const getSvgAvatarUrl = (emoji, start, end) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${start}"/>
        <stop offset="100%" stop-color="${end}"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#grad)" />
    <text x="50" y="54" font-family="'Segoe UI Emoji', sans-serif" font-size="50" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return <div className="text-center mt-20 font-bold text-lg text-[var(--color-text-muted)] animate-pulse">Đang đồng bộ dữ liệu nơ-ron...</div>;

  const xpProgress = (user.xp % 1000) / 1000 * 100; // Giả sử 1000 XP / Level

  const badges = [
    { id: 1, name: 'First Blood', icon: <Target className="w-6 h-6 text-red-500" />, active: true },
    { id: 2, name: 'Cyber Learner', icon: <Cpu className="w-6 h-6 text-[var(--color-primary)]" />, active: true },
    { id: 3, name: '7-Day Streak', icon: <Flame className="w-6 h-6 text-orange-500" />, active: user.streak >= 7 },
    { id: 4, name: 'Vocab Master', icon: <Star className="w-6 h-6 text-yellow-500" />, active: false },
  ];

  const handleSaveAvatar = async (avatarData) => {
    setSaving(true);
    const id = toast.loading('Đang đồng bộ ảnh đại diện mới...');
    try {
      const res = await updateProfile({ avatar: avatarData });
      updateUser({ avatar: res.avatar });
      toast.success('Cập nhật ảnh đại diện thành công!', { id });
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi cập nhật ảnh đại diện. Vui lòng thử lại.', { id });
    } finally {
      setSaving(false);
    }
  };

  const handleCustomAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp ảnh hợp lệ!');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh phải nhỏ hơn 2MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        canvas.width = 150;
        canvas.height = 150;
        
        // Draw image cropped in a circle
        ctx.beginPath();
        ctx.arc(75, 75, 75, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          150,
          150
        );
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        handleSaveAvatar(base64Data);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const hasCustomAvatar = user.avatar && user.avatar !== 'default_cyber_avatar.png';

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-4xl mx-auto py-10 px-4"
    >
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black uppercase tracking-widest text-[var(--color-text)] mb-2">Hồ Sơ Đặc Vụ</h1>
      </header>

      {/* Profile Card */}
      <div className="card-3d p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-[var(--color-surface)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Avatar Container with Hover Overlay */}
        <div className="relative group select-none">
          <div 
            onClick={() => setIsModalOpen(true)}
            className="w-32 h-32 rounded-full border-4 border-[var(--color-surface-border)] relative z-10 overflow-hidden bg-[var(--color-bg)] flex items-center justify-center shadow-lg cursor-pointer transition-transform duration-300 group-hover:scale-105 active:scale-95"
          >
            {hasCustomAvatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <Shield className="w-16 h-16 text-[var(--color-primary)] opacity-60" />
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Camera className="w-6 h-6 mb-1 text-white" />
              <span className="text-[10px] font-black uppercase tracking-wider">Đổi Avatar</span>
            </div>
          </div>
          <div className="absolute -inset-2 rounded-full border border-[var(--color-primary)]/50 animate-pulse-slow" style={{ borderStyle: 'dashed' }}></div>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-black text-[var(--color-text)] mb-2 uppercase tracking-wide">
            {user.username}
          </h2>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
            <span className="px-3.5 py-1.5 bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]/30 rounded-xl text-[var(--color-primary)] font-black text-xs flex items-center gap-2 shadow-sm">
              <Zap className="w-4 h-4 fill-current" /> LEVEL {user.level || 1}
            </span>
            <span className="px-3.5 py-1.5 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl text-orange-500 font-black text-xs flex items-center gap-2 shadow-sm">
              <Flame className="w-4 h-4 fill-current animate-pulse" /> {user.streak || 0} HỌC PHẦN
            </span>
          </div>

          {/* XP Bar */}
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              <span>Kinh nghiệm: {user.xp || 0} XP</span>
              <span>Cấp sau: {(user.level || 1) * 1000} XP</span>
            </div>
            <div className="w-full h-3.5 bg-[var(--color-bg)] rounded-full overflow-hidden border-2 border-[var(--color-surface-border)] shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] relative rounded-full"
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 skew-x-12 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <h3 className="text-2xl font-black text-[var(--color-text)] mb-6 uppercase tracking-wider flex items-center gap-2 select-none">
        <Star className="text-[var(--color-accent)] fill-current" /> Huy Hiệu Thành Tựu
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 select-none">
        {badges.map((badge) => (
          <div 
            key={badge.id}
            className={`card-3d p-6 flex flex-col items-center justify-center text-center bg-[var(--color-surface)] ${
              badge.active 
                ? 'border-[var(--color-primary)]/50 shadow-sm' 
                : 'opacity-55 grayscale border-[var(--color-surface-border)]'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 border-[var(--color-surface-border)] ${
              badge.active ? 'bg-[var(--color-bg)]' : 'bg-[var(--color-bg)]/40'
            }`}>
              {badge.icon}
            </div>
            <span className="font-black text-sm text-[var(--color-text)] uppercase tracking-wide">{badge.name}</span>
          </div>
        ))}
      </div>

      {/* ──═ MODAL: CHOOSE/UPLOAD AVATAR ══── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-3d w-full max-w-lg p-6 relative flex flex-col gap-5 bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)]"
            >
              {/* Close Button */}
              <button
                onClick={() => !saving && setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer z-10"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center select-none">
                <h3 className="text-xl font-black uppercase tracking-wider text-[var(--color-text)] mb-1">
                  Đổi Ảnh Đại Diện
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] font-bold">
                  Chọn một trợ lý Cyber hoặc đăng ảnh chụp từ thiết bị của bạn.
                </p>
              </div>

              {/* Presets Grid */}
              <div className="space-y-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] select-none">Nhóm Cyber Avatars:</span>
                <div className="grid grid-cols-3 gap-3">
                  {PRESETS.map((preset) => {
                    const presetUrl = getSvgAvatarUrl(preset.emoji, preset.start, preset.end);
                    const isSelected = user.avatar === presetUrl;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => !saving && handleSaveAvatar(presetUrl)}
                        disabled={saving}
                        className={`group p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all active:translate-y-[2px] cursor-pointer hover:border-[var(--color-primary)] ${
                          isSelected 
                            ? 'bg-sky-50 dark:bg-sky-950/30 border-[var(--color-primary)]' 
                            : 'bg-[var(--color-bg)] border-[var(--color-surface-border)]'
                        }`}
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm relative overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)` }}
                        >
                          {preset.emoji}
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white stroke-[3px]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-[var(--color-text)] uppercase tracking-wide truncate w-full text-center">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Upload section */}
              <div className="pt-2 border-t border-[var(--color-surface-border)]">
                <div className="flex flex-col items-center gap-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] select-none w-full text-left">Tải ảnh lên từ thiết bị:</span>
                  <label 
                    className={`w-full py-4 border-2 border-dashed border-[var(--color-surface-border)] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-[var(--color-bg)] hover:border-[var(--color-primary)] ${
                      saving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-6 h-6 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
                    <span className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide">Chọn tệp hình ảnh</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">PNG, JPG (tối đa 2MB)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCustomAvatarUpload}
                      disabled={saving}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
