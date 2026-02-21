import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './constants';

// ─── Single Central Axios Instance ────────────────────────────────────────────
// All API calls (admin, vendor, customer) go through this one instance.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach the right token based on the request path
api.interceptors.request.use(
  (config) => {
    // Admin routes use adminToken, vendor routes use vendor-token, all others use token
    const isAdminRoute = config.url?.startsWith('/admin');
    const isVendorRoute = config.url?.startsWith('/vendor');
    const isDeliveryRoute = config.url?.startsWith('/delivery');
    const token = isAdminRoute
      ? localStorage.getItem('adminToken')
      : isVendorRoute
        ? localStorage.getItem('vendor-token')
        : isDeliveryRoute
          ? localStorage.getItem('delivery-token')
        : localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — unwrap data and handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    toast.error(message);

    if (error.response?.status === 401) {
      const isAdminRoute = error.config?.url?.startsWith('/admin');
      const isVendorRoute = error.config?.url?.startsWith('/vendor');
      const isDeliveryRoute = error.config?.url?.startsWith('/delivery');
      const currentPath = window.location.pathname;
      const isInAdminArea = currentPath.startsWith('/admin');
      const isInVendorArea = currentPath.startsWith('/vendor');
      const isInDeliveryArea = currentPath.startsWith('/delivery');
      if (isAdminRoute) {
        // Clear both manual token and persisted Zustand state to break the redirect loop
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin-auth-storage');

        // Only redirect and toast if we're not already on the login page
        if (isInAdminArea && !currentPath.includes('/admin/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/admin/login';
        }
      } else if (isVendorRoute) {
        localStorage.removeItem('vendor-token');
        localStorage.removeItem('vendor-auth-storage');

        if (isInVendorArea && !currentPath.includes('/vendor/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/vendor/login';
        }
      } else if (isDeliveryRoute) {
        localStorage.removeItem('delivery-token');
        localStorage.removeItem('delivery-auth-storage');

        if (isInDeliveryArea && !currentPath.includes('/delivery/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/delivery/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');

        const isAuthPage =
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath === '/verification';

        if (!isAuthPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
