import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';
import { useAuthStore } from './authStore';

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));
const normalizeId = (value) => String(value ?? '').trim();

const normalizeWishlistItem = (item) => {
  const product = item?.productId || item;
  const id = normalizeId(product?.id || product?._id || item?.id);
  return {
    id,
    name: product?.name || item?.name || 'Product',
    price: Number(product?.price ?? item?.price ?? 0),
    image: product?.image || item?.image || '',
    stock: product?.stock || item?.stock,
    unit: product?.unit || item?.unit,
    rating: Number(product?.rating ?? item?.rating ?? 0),
    originalPrice:
      product?.originalPrice !== undefined
        ? Number(product.originalPrice)
        : item?.originalPrice !== undefined
          ? Number(item.originalPrice)
          : undefined,
    productId: normalizeId(product?._id || item?.productId || item?.id),
  };
};

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      hasFetched: false,

      fetchWishlist: async () => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) {
          return get().items;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/user/wishlist');
          const payload = response?.data ?? response;
          const list = Array.isArray(payload)
            ? payload.map(normalizeWishlistItem).filter((item) => item.id)
            : [];
          set({ items: list, isLoading: false, hasFetched: true });
          return list;
        } catch {
          set({ isLoading: false });
          return get().items;
        }
      },

      ensureHydrated: () => {
        const authState = useAuthStore.getState();
        const state = get();
        if (authState?.isAuthenticated && !state.hasFetched && !state.isLoading) {
          state.fetchWishlist().catch(() => null);
        }
      },

      // Add item to wishlist
      addItem: (item) => {
        const normalizedItem = normalizeWishlistItem(item);
        if (!normalizedItem.id) {
          return;
        }
        set((state) => {
          const existingItem = state.items.find(
            (i) => normalizeId(i.id) === normalizeId(normalizedItem.id)
          );
          if (existingItem) {
            return state; // Item already in wishlist
          }
          return {
            items: [...state.items, normalizedItem],
          };
        });

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated && isMongoId(normalizedItem.id)) {
          api.post('/user/wishlist', { productId: String(normalizedItem.id) }).catch(() => null);
        }
      },

      // Remove item from wishlist
      removeItem: (id) => {
        const normalizedId = normalizeId(id);
        set((state) => ({
          items: state.items.filter((item) => normalizeId(item.id) !== normalizedId),
        }));

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated && isMongoId(normalizedId)) {
          api.delete(`/user/wishlist/${normalizedId}`).catch(() => null);
        }
      },

      // Check if item is in wishlist
      isInWishlist: (id) => {
        get().ensureHydrated();
        const state = get();
        const normalizedId = normalizeId(id);
        return state.items.some((item) => normalizeId(item.id) === normalizedId);
      },

      // Clear wishlist
      clearWishlist: () => {
        const items = [...get().items];
        set({ items: [] });

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated) {
          items
            .filter((item) => isMongoId(item.id))
            .forEach((item) => {
              api.delete(`/user/wishlist/${item.id}`).catch(() => null);
            });
        }
      },

      // Get wishlist count
      getItemCount: () => {
        get().ensureHydrated();
        const state = get();
        return state.items.length;
      },

      // Move item from wishlist to cart (returns item for cart)
      moveToCart: (id) => {
        const normalizedId = normalizeId(id);
        const state = get();
        const item = state.items.find((i) => normalizeId(i.id) === normalizedId);
        if (item) {
          set({
            items: state.items.filter((i) => normalizeId(i.id) !== normalizedId),
          });

          const authState = useAuthStore.getState();
          if (authState?.isAuthenticated && isMongoId(normalizedId)) {
            api.delete(`/user/wishlist/${normalizedId}`).catch(() => null);
          }

          return item;
        }
        return null;
      },

      resetWishlist: () => {
        set({ items: [], hasFetched: false });
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

