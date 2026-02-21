import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { adminLogin as apiLogin } from '../services/adminService';

export const useAdminAuthStore = create(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Admin login — calls real backend
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiLogin(email, password);
          const { accessToken, admin } = response.data;

          // Store token under 'adminToken' key (used by adminService interceptor)
          localStorage.setItem('adminToken', accessToken);

          set({
            admin,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, admin };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Admin logout
      logout: () => {
        set({ admin: null, token: null, isAuthenticated: false });
        localStorage.removeItem('adminToken');
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
