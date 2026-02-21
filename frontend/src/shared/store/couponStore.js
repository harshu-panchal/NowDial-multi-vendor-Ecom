import { create } from 'zustand';
import * as adminService from '../../modules/Admin/services/adminService';
import toast from 'react-hot-toast';

export const useCouponStore = create((set, get) => ({
    coupons: [],
    isLoading: false,
    pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 1
    },

    fetchCoupons: async (params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getAllCoupons(params);
            set({
                coupons: response.data.coupons,
                pagination: response.data.pagination,
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to fetch coupons');
        }
    },

    addCoupon: async (couponData) => {
        set({ isLoading: true });
        try {
            const response = await adminService.createCoupon(couponData);
            set(state => ({
                coupons: [response.data, ...state.coupons],
                isLoading: false
            }));
            toast.success('Coupon created successfully');
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to create coupon');
            throw error;
        }
    },

    updateCoupon: async (id, couponData) => {
        set({ isLoading: true });
        try {
            const response = await adminService.updateCoupon(id, couponData);
            set(state => ({
                coupons: state.coupons.map(c => c._id === id ? response.data : c),
                isLoading: false
            }));
            toast.success('Coupon updated successfully');
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to update coupon');
            throw error;
        }
    },

    deleteCoupon: async (id) => {
        set({ isLoading: true });
        try {
            await adminService.deleteCoupon(id);
            set(state => ({
                coupons: state.coupons.filter(c => c._id !== id),
                isLoading: false
            }));
            toast.success('Coupon deleted successfully');
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to delete coupon');
            throw error;
        }
    }
}));
