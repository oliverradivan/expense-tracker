import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from './NavBar';

// Import page components (lazy loaded)
const DashboardPage = React.lazy(() => import('../pages/Dashboard.jsx'));
const HistoryPage = React.lazy(() => import('../pages/History.jsx'));
const LogPage = React.lazy(() => import('../pages/LogExpense.jsx'));
const ReviewPage = React.lazy(() => import('../pages/MIR.jsx'));
const SettingsPage = React.lazy(() => import('../pages/Settings.jsx'));

// Static maps
const PAGE_TO_INDEX = {
  dashboard: 0,
  history: 1,
  log: 2,
  review: 3,
  settings: 4,
};
const INDEX_TO_PAGE = ['dashboard', 'history', 'log', 'review', 'settings'];

const Layout = () => {
  /* eslint-disable-next-line */
  const { user } = useAuth(); // kept for potential future use
  const navigate = useNavigate();
  const { page } = useParams();

  // Initialize active index based on page param
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = PAGE_TO_INDEX[page] || 0;
    return index;
  });

  const scrollRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Scroll to the active index when it changes
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = scrollRef.current.clientWidth * activeIndex;
      if (typeof window !== 'undefined') {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          scrollRef.current.scrollTo({ left: scrollTo, behavior: 'auto' });
        } else {
          scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
      }
    }
  }, [activeIndex]);

  // Update URL when active index changes (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      const newPage = INDEX_TO_PAGE[activeIndex];
      navigate(`/${newPage}`, { replace: true });
    }, 100);
    return () => clearTimeout(handler);
  }, [activeIndex, navigate]); // removed INDEX_TO_PAGE

  // Handle scroll and keydown events
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const scrollLeft = scrollRef.current.scrollLeft;
      const clientWidth = scrollRef.current.clientWidth;
      if (clientWidth === 0) return;
      const index = Math.round(scrollLeft / clientWidth);
      setActiveIndex(Math.max(0, Math.min(index, INDEX_TO_PAGE.length - 1)));
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && !e.target.matches('input, textarea, select, button')) {
        e.preventDefault();
        setActiveIndex((prevIndex) => Math.min(prevIndex + 1, INDEX_TO_PAGE.length - 1));
      } else if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea, select, button')) {
        e.preventDefault();
        setActiveIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    // Resize observer to handle window resizing
    resizeObserverRef.current = new ResizeObserver(() => {
      if (scrollRef.current) {
        const scrollTo = scrollRef.current.clientWidth * activeIndex;
        scrollRef.current.scrollLeft = scrollTo;
      }
    });
    if (scrollRef.current) {
      resizeObserverRef.current.observe(scrollRef.current);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [activeIndex]); // removed INDEX_TO_PAGE.length

  return (
    <div ref={scrollRef} className="scroll-container">
      <NavBar activeIndex={activeIndex} onNavigate={navigate} />
      <div className="pages-container">
        <div className="page">
          <DashboardPage />
        </div>
        <div className="page">
          <HistoryPage />
        </div>
        <div className="page">
          <LogPage />
        </div>
        <div className="page">
          <ReviewPage />
        </div>
        <div className="page">
          <SettingsPage />
        </div>
      </div>
    </div>
  );
};

export default Layout;