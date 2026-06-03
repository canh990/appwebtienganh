import Navbar from '../components/Navbar';
import AIHelper from '../components/AIHelper';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
        {children}
      </main>
      <AIHelper />
    </div>
  );
};

export default MainLayout;
