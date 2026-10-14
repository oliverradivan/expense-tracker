import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from './NavBar';

// Import page components
const DashboardPage = React.lazy(() => import('../pages/dashboard/DashboardPage.jsx'));
const HistoryPage = React.lazy(() => import('../pages/history/HistoryPage.jsx'));
const LogPage = React.lazy(() => import('../pages/logexpense/LogPage.jsx'));
const ReviewPage = React.lazy(() => import('../pages/analysis/ReviewPage.jsx'));
const SettingsPage = React.lazy(() => import('../pages/settings/SettingsPage.jsx'));

const Layout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { page } = useParams();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  let resizeObserver = null;

  // Map of page names to indices
  const pageToIndex = {
    dashboard: 0,
    history: 1,
    log: 2,
    review: 3,
    settings: 4,
  };

  // Map of indices to page names
  const indexToPage = ['dashboard', 'history', 'log', 'review', 'settings'];

  // Set active index based on page parameter
  useEffect(() => {
    const index = pageToIndex[page] || 0;
    setActiveIndex(index);
  }, [page]);

  // Update URL when active index changes (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      const newPage = indexToPage[activeIndex];
      navigate(`/${newPage}`, { replace: true });
    }, 100);
    return () => clearTimeout(handler);
  }, [activeIndex, navigate]);

  // Scroll to the active index when it changes
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = scrollRef.current.clientWidth * activeIndex;
      if (typeof window !== 'undefined') {
        // Check if we should reduce motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          scrollRef.current.scrollTo({ left: scrollTo, behavior: 'auto' });
        } else {
          scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
      }
    }
  }, [activeIndex]);

  // Update active index when the user scrolls (e.g., via touch drag)
  const handleScroll = () => {
    if (!scrollRef.current || isDragging) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const clientWidth = scrollRef.current.clientWidth;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    setActiveIndex(Math.max(0, Math.min(index, indexToPage.length - 1)));
  };

  // Handle touch start to prevent scrolling during drag? We'll rely on natural scrolling.
  // We'll set a flag to ignore scroll events during touch drag if needed, but we can leave it.

  // Handle keydown for left/right arrows
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' && !e.target.matches('input, textarea, select, button')) {
      e.preventDefault();
      setActiveIndex((prevIndex) => Math.min(prevIndex + 1, indexToPage.length - 1));
    } else if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea, select, button')) {
      e.preventDefault();
      setActiveIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    // Resize observer to handle window resizing
    resizeObserver = new ResizeObserver(() => {
      // Re-scroll to the active index when the container size changes
      if (scrollRef.current) {
        const scrollTo = scrollRef.current.clientWidth * activeIndex;
        scrollRef.current.scrollLeft = scrollTo;
      }
    });
    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [scrollRef]);

  return (
    <div
      ref={scrollRef}
      className="scroll-container"
    >
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