import { motion } from 'framer-motion';
import { BookOpen, Brain, Users, ArrowRight, CheckCircle2, Award, ShieldCheck } from 'lucide-react';
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
    <div className="relative min-h-[calc(100vh-100px)] flex flex-col items-center justify-center px-4 overflow-hidden py-12 md:py-20 bg-[var(--color-bg)]">
      
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[100px] -z-10 animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-secondary)]/5 rounded-full blur-[100px] -z-10 animate-float" style={{ animationDelay: '2s' }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
      >
        {/* Left Column: Text Content */}
        <div className="lg:col-span-7 text-left space-y-8">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Học tập Gamified thú vị</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-[var(--color-text)]"
          >
            Học Tiếng Anh <br />
            <span className="text-[var(--color-primary)]">Vui Nhộn & Miễn Phí!</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-xl"
          >
            Cùng **CyberLingo** chinh phục tiếng Anh mỗi ngày thông qua các bài học thông minh, flashcard trực quan và các bài kiểm tra phản xạ nơ-ron cực kỳ cuốn hút!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link to={user ? "/dashboard" : "/auth"}>
              <button className="w-full sm:w-auto btn-3d-primary py-4 px-8 text-base rounded-2xl flex items-center justify-center gap-3 animate-bounce-slow">
                <span>{user ? 'Vào học ngay' : 'Bắt đầu học ngay'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link to="/vocabulary">
              <button className="w-full sm:w-auto btn-3d-secondary py-4 px-8 text-base rounded-2xl">
                Khám phá từ vựng
              </button>
            </Link>
          </motion.div>

          {/* Slogan checks */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-surface-border)]">
            {[
              { icon: <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />, text: "100% Miễn phí" },
              { icon: <Award className="w-4 h-4 text-[var(--color-secondary)]" />, text: "Học tập qua trò chơi" },
              { icon: <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />, text: "Theo dõi tiến độ chuẩn" },
              { icon: <Users className="w-4 h-4 text-purple-500" />, text: "Cộng đồng thi đua sôi nổi" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)]">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Illustration */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 flex justify-center items-center relative"
        >
          <div className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full bg-sky-200/30 dark:bg-sky-950/20 blur-3xl -z-10" />
          <motion.img 
            src="/mascot.png" 
            alt="CyberLingo Mascot" 
            className="w-72 h-72 md:w-96 md:h-96 object-contain drop-shadow-xl select-none"
            animate={{ 
              y: [0, -12, 0],
              rotate: [0, 1, -1, 0]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="w-full max-w-6xl mt-20 z-10 grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Từ vựng thông minh', val: '1,500+', desc: 'Bản dịch đầy đủ & ví dụ' },
          { label: 'Chủ đề bài học', val: '50+', desc: 'Từ sơ cấp đến nâng cao' },
          { label: 'Học viên tích cực', val: '10,000+', desc: 'Cùng nhau học tập tiến bộ' },
          { label: 'Bài kiểm tra', val: '100,000+', desc: 'Luyện tập củng cố nơ-ron' }
        ].map((stat, i) => (
          <div key={i} className="card-3d p-6 text-center bg-[var(--color-surface)] hover:scale-102 transition-transform duration-200">
            <h3 className="text-3xl font-black text-[var(--color-primary)] mb-1">{stat.val}</h3>
            <p className="text-sm font-bold text-[var(--color-text)] mb-0.5">{stat.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{stat.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Feature Details Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-16 z-10"
      >
        {[
          { 
            icon: <BookOpen className="w-6 h-6 text-white" />, 
            color: 'bg-[var(--color-primary)]',
            title: "Thẻ từ thông minh", 
            desc: "Học từ vựng qua flashcard 3D sinh động, phát âm chuẩn xác, ví dụ thực tế và lưu trữ từ yêu thích thuận tiện." 
          },
          { 
            icon: <Brain className="w-6 h-6 text-white" />, 
            color: 'bg-[#58cc02]',
            title: "Trắc nghiệm tương tác", 
            desc: "Kiểm tra phản xạ nơ-ron với hệ thống câu hỏi phong phú, tính điểm thông minh và phản hồi đáp án tức thì." 
          },
          { 
            icon: <Users className="w-6 h-6 text-white" />, 
            color: 'bg-[#ff9600]',
            title: "Đua bảng xếp hạng", 
            desc: "Tích lũy XP thông qua việc học tập hằng ngày để thi đua cùng hàng ngàn học viên khác trên bảng xếp hạng toàn cầu." 
          }
        ].map((feat, i) => (
          <div key={i} className="card-3d p-8 text-left bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 transition-colors group">
            <div className={`w-12 h-12 rounded-2xl ${feat.color} flex items-center justify-center mb-6 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              {feat.icon}
            </div>
            <h3 className="text-xl font-black mb-3 text-[var(--color-text)]">{feat.title}</h3>
            <p className="text-[var(--color-text-muted)] font-medium text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Home;
