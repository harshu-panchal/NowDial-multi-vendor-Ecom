import { create } from 'zustand';
import * as adminService from '../../modules/Admin/services/adminService';
import toast from 'react-hot-toast';

export const useReturnStore = create((set, get) => ({
    returnRequests: [],
    isLoading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 1
    },

    fetchReturnRequests: async (params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getAllReturnRequests(params);
            set({
                returnRequests: response.data.returnRequests || [],
                pagination: response.data.pagination || {
                    total: 0,
                    page: 1,
                    limit: 10,
                    pages: 1,
                },
                isLoading: false
            });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error(error.message || 'Failed to fetch return requests');
        }
    },

    fetchReturnRequestById: async (id) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getReturnRequestById(id);
            set({ isLoading: false });
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to fetch return request details');
            return null;
        }
    },

    updateReturnStatus: async (id, statusData) => {
        set({ isLoading: true });
        try {
            const response = await adminService.updateReturnRequestStatus(id, statusData);
            const updatedReq = response.data;
            set((state) => ({
                returnRequests: state.returnRequests.map((req) =>
                    req.id === id ? { ...req, ...updatedReq } : req
                ),
                isLoading: false
            }));
            toast.success('Return status updated successfully');
            return true;
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to update return status');
            return false;
        }
    }
}));
