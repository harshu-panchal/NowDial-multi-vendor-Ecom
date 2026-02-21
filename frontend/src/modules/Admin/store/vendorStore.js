import { create } from "zustand";
import {
  getAllVendors,
  getVendorById,
  updateVendorStatus as updateVendorStatusApi,
  updateCommissionRate as updateCommissionRateApi,
} from "../services/adminService";

export const useVendorStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const response = await getAllVendors({ limit: 500 });
      const payload = response?.data ?? response;
      const vendors = Array.isArray(payload?.vendors) ? payload.vendors : [];
      set({ vendors, isLoading: false });
      return vendors;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  getAllVendors: () => get().vendors,

  getVendor: async (id) => {
    const existing = get().vendors.find((v) => String(v.id) === String(id));
    if (existing) {
      set({ selectedVendor: existing });
      return existing;
    }

    try {
      const response = await getVendorById(id);
      const vendor = response?.data ?? response;
      if (!vendor) return null;
      set((state) => ({
        selectedVendor: vendor,
        vendors: state.vendors.some((v) => String(v.id) === String(vendor.id))
          ? state.vendors.map((v) => (String(v.id) === String(vendor.id) ? vendor : v))
          : [...state.vendors, vendor],
      }));
      return vendor;
    } catch {
      return null;
    }
  },

  updateVendorStatus: async (id, status, reason = "") => {
    try {
      const response = await updateVendorStatusApi(id, status, reason);
      const vendor = response?.data ?? response;
      if (!vendor) return false;
      set((state) => ({
        vendors: state.vendors.map((v) =>
          String(v.id) === String(id) ? { ...v, ...vendor } : v
        ),
        selectedVendor:
          state.selectedVendor && String(state.selectedVendor.id) === String(id)
            ? { ...state.selectedVendor, ...vendor }
            : state.selectedVendor,
      }));
      return true;
    } catch {
      return false;
    }
  },

  updateCommissionRate: async (id, commissionRate) => {
    try {
      const response = await updateCommissionRateApi(id, commissionRate);
      const vendor = response?.data ?? response;
      if (!vendor) return false;
      set((state) => ({
        vendors: state.vendors.map((v) =>
          String(v.id) === String(id) ? { ...v, ...vendor } : v
        ),
        selectedVendor:
          state.selectedVendor && String(state.selectedVendor.id) === String(id)
            ? { ...state.selectedVendor, ...vendor }
            : state.selectedVendor,
      }));
      return true;
    } catch {
      return false;
    }
  },
}));

