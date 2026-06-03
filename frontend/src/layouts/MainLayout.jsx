import Navbar from '../components/Navbar';
import AIHelper from '../components/AIHelper';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[var(--color-bg)] transition-colors duration-300">
      {/* Subtle modern background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-[var(--color-secondary)]/5" />
      
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 relative z-10 w-full max-w-7xl">
        {children}
      </main>
      
      <AIHelper />
    </div>
  );
};

export default MainLayout;
