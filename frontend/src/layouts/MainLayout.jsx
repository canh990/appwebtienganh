import Navbar from '../components/Navbar';
import AIHelper from '../components/AIHelper';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat' || location.pathname === '/community-chat';

  useEffect(() => {
    console.log('[MainLayout] path:', location.pathname, 'isChatRoute:', isChatRoute);
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
    <div className={`flex flex-col relative bg-[var(--color-bg)] transition-colors duration-300 ${isChatRoute ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
      {/* Subtle modern background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-[var(--color-secondary)]/5" />
      
      <Navbar />
      
      <main className={`flex-grow relative w-full flex flex-col overflow-hidden ${isChatRoute ? '' : 'container mx-auto px-4 py-8 md:py-12 max-w-7xl overflow-y-auto'}`}>
        {children}
      </main>
      
      {!isChatRoute && <AIHelper />}
    </div>
  );
};

export default MainLayout;
