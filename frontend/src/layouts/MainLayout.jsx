import Navbar from '../components/Navbar';
import AIHelper from '../components/AIHelper';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

/* ── Scroll to Top Button ─────────────────────────────────────────────── */
const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById('main-scroll-area');
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollUp = () => {
    document.getElementById('main-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={scrollUp}
          aria-label="Scroll to top"
          className="fixed bottom-[84px] md:bottom-6 right-5 z-40 w-11 h-11 rounded-2xl shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 4px 16px rgba(28,176,246,0.35)',
            borderBottom: '3px solid var(--color-primary-hover)',
          }}
        >
          <ChevronUp className="w-5 h-5 text-white" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* ── Main Layout ──────────────────────────────────────────────────────── */
const MainLayout = ({ children }) => {
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat' || location.pathname === '/community-chat';

  // Scroll back to top on route change
  useEffect(() => {
    document.getElementById('main-scroll-area')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (isChatRoute) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isChatRoute, location.pathname]);

  return (
    <div
      className={`flex flex-col relative bg-[var(--color-bg)] transition-colors duration-300 ${
        isChatRoute ? 'h-screen overflow-hidden' : 'h-screen'
      }`}
    >
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-[var(--color-secondary)]/5" />

      <Navbar />

      <main
        id="main-scroll-area"
        className={`flex-grow relative w-full flex flex-col overflow-x-hidden ${
          isChatRoute
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        <div
          className={
            isChatRoute
              ? 'flex-1 flex flex-col h-full'
              : 'container mx-auto px-4 py-8 md:py-12 max-w-7xl pb-[88px] md:pb-12'
          }
        >
          {children}
        </div>
      </main>

      {!isChatRoute && (
        <>
          <AIHelper />
          <ScrollToTop />
        </>
      )}
    </div>
  );
};

export default MainLayout;
