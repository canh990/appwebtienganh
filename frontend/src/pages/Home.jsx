import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, Sparkles, BookOpen, Brain, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="relative min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center px-4 overflow-hidden py-12 md:py-20">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px] -z-10 mix-blend-multiply dark:mix-blend-lighten animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-[100px] -z-10 mix-blend-multiply dark:mix-blend-lighten animate-float" style={{ animationDelay: '2s' }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl w-full z-10"
      >
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <div className="px-4 py-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)]/50 backdrop-blur-md shadow-sm inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">Hệ thống học ngôn ngữ thế hệ mới</span>
          </div>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight"
        >
          Nâng Cấp Kỹ Năng Với{' '}
          <span className="text-gradient inline-block">
            CyberLingo
          </span>
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Trải nghiệm học thuật cá nhân hóa qua nền tảng hỗ trợ bởi AI, theo dõi tiến độ chi tiết và kết nối cộng đồng toàn cầu.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to={user ? "/dashboard" : "/auth"}>
            <button className="w-full sm:w-auto btn-primary px-8 py-4 text-base rounded-2xl flex items-center justify-center gap-2 group">
              {user ? 'Truy Cập Dashboard' : 'Bắt Đầu Ngay'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link to="/vocabulary">
            <button className="w-full sm:w-auto btn-secondary px-8 py-4 text-base rounded-2xl">
              Khám Phá Từ Vựng
            </button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-20 z-10"
      >
        {[
          { icon: <BookOpen className="w-6 h-6" />, title: "Từ Vựng Thông Minh", desc: "Hệ thống thẻ ghi nhớ (flashcard) kết hợp phát âm trực quan." },
          { icon: <Brain className="w-6 h-6" />, title: "Kiểm Tra Nhạy Bén", desc: "Đánh giá trình độ tức thì qua các bài trắc nghiệm tính điểm." },
          { icon: <Users className="w-6 h-6" />, title: "Cộng Đồng Mở", desc: "Thảo luận, học hỏi cùng hàng ngàn học viên trên toàn cầu." }
        ].map((feat, i) => (
          <div key={i} className="glass-panel p-8 text-left group hover:border-[var(--color-primary)]/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-border)] flex items-center justify-center mb-6 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
              {feat.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
            <p className="text-[var(--color-text-muted)] font-medium leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Home;
