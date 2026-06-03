import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, User, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser } from '../services/authService';
import { pageVariants } from '../animations/variants';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authFunction = isLogin ? loginUser : registerUser;
      const data = await authFunction(formData);
      
      login(data.user, data.token, data.refreshToken);
      toast.success(isLogin ? 'Đăng nhập thành công!' : 'Khởi tạo hồ sơ thành công!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Lỗi hệ thống!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-[70vh] flex items-center justify-center"
    >
      <div className="glass-panel p-10 w-full max-w-md relative overflow-hidden">
        {/* Animated borders */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-[var(--color-secondary)] to-transparent opacity-50"></div>

        <div className="text-center mb-8">
          <Terminal className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-4" />
          <h2 className="text-3xl font-black font-mono uppercase tracking-widest text-glow mb-2">
            {isLogin ? 'Liên Kết Nơ-ron' : 'Cấp Quyền Truy Cập'}
          </h2>
          <p className="text-gray-400 font-mono text-sm">
            {isLogin ? 'Đăng nhập vào hệ thống CyberLingo' : 'Tạo hồ sơ nhận dạng mới'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tên định danh (Username)"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full bg-black/50 border border-[var(--color-dark-surface-border)] rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input 
              type="password" 
              placeholder="Mật mã an ninh (Password)"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-black/50 border border-[var(--color-dark-surface-border)] rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-3 flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Đang thiết lập kết nối...</span>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" /> 
                {isLogin ? 'Khởi Động Giao Thức' : 'Tạo Hồ Sơ Mới'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[var(--color-dark-surface-border)] pt-6">
          <p className="text-gray-400 font-mono text-sm">
            {isLogin ? 'Chưa có hồ sơ nhận dạng?' : 'Đã có hồ sơ nhận dạng?'}
          </p>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[var(--color-primary)] hover:text-white font-mono uppercase tracking-wider mt-2 transition-colors text-sm"
          >
            {isLogin ? '=> Khởi tạo ngay' : '=> Kết nối ngay'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;
