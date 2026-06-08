import Navbar from '../components/Navbar';
import AIHelper from '../components/AIHelper';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


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
              ? 'flex-1 flex flex-col h-full pb-[60px] md:pb-0'
              : 'container mx-auto px-4 py-8 md:py-12 max-w-7xl pb-[88px] md:pb-12'
          }
        >
          {children}
        </div>
      </main>

      {!isChatRoute && (
        <AIHelper />
      )}
    </div>
  );
};

export default MainLayout;
