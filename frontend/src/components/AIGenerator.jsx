import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateAIWords } from '../services/seedService';
import toast from 'react-hot-toast';

const AIGenerator = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const toastId = toast.loading('Đang gửi tín hiệu tới Nexus AI để sinh từ vựng...');
    try {
      const data = await generateAIWords();
      toast.success(data.message || 'AI đã sinh từ vựng mới thành công!', { id: toastId });
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.message || 'Không thể liên kết với Nexus AI. Vui lòng thử lại sau.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className={`btn-primary flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider relative overflow-hidden group cursor-pointer ${
        loading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      style={{
        borderColor: 'var(--color-accent)',
        boxShadow: '0 0 10px rgba(255, 0, 128, 0.2)',
      }}
    >
      {/* Sparkle background pulse */}
      <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-secondary)]/20 to-[var(--color-accent)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
      
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
          <span>Đang tạo nơ-ron...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 text-[var(--color-accent)] group-hover:animate-pulse" />
          <span>AI Sinh Từ Vựng</span>
        </>
      )}
    </button>
  );
};

export default AIGenerator;
