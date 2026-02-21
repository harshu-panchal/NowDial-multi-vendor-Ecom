import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = window.atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, token } = useAuthStore();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(false);
  const tokenPayload = decodeJwtPayload(token || localStorage.getItem('token'));
  const resolvedRole = String(user?.role || tokenPayload?.role || '').toLowerCase();

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

  if (resolvedRole && resolvedRole !== 'customer') {
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

