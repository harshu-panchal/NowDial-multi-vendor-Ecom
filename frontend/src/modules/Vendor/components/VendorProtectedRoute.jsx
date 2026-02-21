import { Navigate, useLocation } from 'react-router-dom';
import { useVendorAuthStore } from '../store/vendorAuthStore';

const VendorProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useVendorAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to vendor login page with return URL
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  return children;
};

export default VendorProtectedRoute;

