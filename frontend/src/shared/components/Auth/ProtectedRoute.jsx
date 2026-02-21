import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if screen is desktop (≥1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    // Initial check
    checkDesktop();
    
    // Listen for resize events
    window.addEventListener('resize', checkDesktop);
    
    return () => {
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  if (!isAuthenticated) {
    // If accessing /app/* route on desktop view, redirect to desktop login
    const isAppRoute = location.pathname.startsWith('/app');
    
    if (isAppRoute && isDesktop) {
      // Redirect to desktop login page when accessing /app/* routes on desktop
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (isAppRoute) {
      // Legacy /app/* paths should also redirect to current login route
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // Default redirect to desktop login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

