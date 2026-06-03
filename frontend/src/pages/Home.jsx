import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Globe, Zap, Cpu } from 'lucide-react';
import { pageVariants } from '../animations/variants';

const Home = () => {
  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[80vh] text-center"
    >
      <div className="relative mb-12">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] filter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
          Làm chủ Tiếng Anh
        </h1>
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-widest mt-2 text-white" style={{ animation: 'var(--animate-glitch)' }}>
          Kỷ Nguyên Mới
        </h2>
        
        {/* Cyberpunk decorative elements */}
        <div className="absolute -top-10 -left-10 w-20 h-20 border-t-4 border-l-4 border-[var(--color-primary)] opacity-50"></div>
        <div className="absolute -bottom-10 -right-10 w-20 h-20 border-b-4 border-r-4 border-[var(--color-secondary)] opacity-50"></div>
      </div>

      <p className="max-w-2xl text-xl text-gray-400 mb-12 font-mono">
        Kết nối vào mạng lưới nơ-ron và tải thẳng ngoại ngữ vào não bộ của bạn. 
        Học tập tương tác, giao tiếp cùng trí tuệ nhân tạo và chỉnh âm thời gian thực.
      </p>

      <div className="flex gap-6">
        <Link to="/vocabulary">
          <button className="btn-primary text-xl px-10 py-4 flex items-center gap-3">
            Bắt Đầu Học <ChevronRight />
          </button>
        </Link>
        <button className="btn-secondary text-xl px-10 py-4 opacity-80 hover:opacity-100">
          Xem Demo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-5xl">
        <FeatureCard 
          icon={<Globe className="w-10 h-10 text-[var(--color-primary)]" />}
          title="Kho Từ Vựng"
          desc="Mở rộng vốn từ với hình ảnh minh họa, phiên âm quốc tế và giọng đọc bản ngữ chuẩn xác."
        />
        <FeatureCard 
          icon={<Zap className="w-10 h-10 text-[var(--color-accent)]" />}
          title="Phản Xạ Nhanh"
          desc="Thử thách trí não bằng các bài trắc nghiệm tự động tùy chỉnh theo tiến độ học tập."
        />
        <FeatureCard 
          icon={<Cpu className="w-10 h-10 text-[var(--color-secondary)]" />}
          title="Trợ Lý AI"
          desc="Luyện giao tiếp với AI tiên tiến để làm quen với các tình huống và tiếng lóng thực tế."
        />
      </div>
    </motion.div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-panel glass-panel-hover p-8 flex flex-col items-center text-center group cursor-pointer relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="mb-6 p-4 rounded-full bg-white/5 group-hover:bg-[var(--color-primary)]/10 transition-colors">
      {icon}
    </div>
    <h3 className="text-2xl font-bold font-mono mb-4 text-white group-hover:text-glow transition-all">{title}</h3>
    <p className="text-gray-400 group-hover:text-gray-200">{desc}</p>
  </div>
);

export default Home;
