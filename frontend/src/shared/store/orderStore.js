import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCommissionStore } from './commissionStore';
import api from '../utils/api';

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));

const normalizeOrderItem = (item) => ({
  ...item,
  id: item?.id || item?.productId || item?._id,
});

const normalizeVendorGroup = (group) => ({
  ...group,
  vendorId: String(group?.vendorId || ''),
  items: Array.isArray(group?.items) ? group.items.map(normalizeOrderItem) : [],
});

const normalizeOrder = (order) => {
  const id = order?.id || order?.orderId || order?._id;
  return {
    ...order,
    id,
    date: order?.date || order?.createdAt || new Date().toISOString(),
    userId: order?.userId || null,
    items: Array.isArray(order?.items) ? order.items.map(normalizeOrderItem) : [],
    vendorItems: Array.isArray(order?.vendorItems)
      ? order.vendorItems.map(normalizeVendorGroup)
      : [],
  };
};

const normalizePublicTrackingOrder = (order) =>
  normalizeOrder({
    ...order,
    id: order?.orderId || order?._id,
    date: order?.createdAt || order?.date,
    items: [],
    vendorItems: [],
  });

const localCreateOrder = (orderData) => {
  const orderId = `ORD-${Date.now()}`;
  const trackingNumber = `TRK${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(
    estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 5
  );

  const vendorItems = orderData.vendorItems || [];
  let calculatedVendorItems = [];

  if (vendorItems.length === 0 && orderData.items) {
    const vendorGroups = {};
    orderData.items.forEach((item) => {
      const vendorId = item.vendorId || 1;
      const vendorName = item.vendorName || 'Unknown Vendor';

      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendorId,
          vendorName,
          items: [],
          subtotal: 0,
          shipping: 0,
          tax: 0,
          discount: 0,
        };
      }

      const itemSubtotal = item.price * item.quantity;
      vendorGroups[vendorId].items.push(item);
      vendorGroups[vendorId].subtotal += itemSubtotal;
    });

    const totalSubtotal = Object.values(vendorGroups).reduce((sum, v) => sum + v.subtotal, 0);
    const shippingPerVendor = orderData.shipping / Math.max(1, Object.keys(vendorGroups).length);

    calculatedVendorItems = Object.values(vendorGroups).map((vendorGroup) => ({
      ...vendorGroup,
      shipping: shippingPerVendor,
      tax: (vendorGroup.subtotal * (orderData.tax || 0)) / (totalSubtotal || 1),
      discount: (vendorGroup.subtotal * (orderData.discount || 0)) / (totalSubtotal || 1),
    }));
  } else {
    calculatedVendorItems = vendorItems;
  }

  return normalizeOrder({
    id: orderId,
    orderId,
    userId: orderData.userId || null,
    date: new Date().toISOString(),
    status: 'pending',
    items: orderData.items || [],
    vendorItems: calculatedVendorItems,
    shippingAddress: orderData.shippingAddress || {},
    paymentMethod: orderData.paymentMethod || 'card',
    subtotal: orderData.subtotal || 0,
    shipping: orderData.shipping || 0,
    tax: orderData.tax || 0,
    discount: orderData.discount || 0,
    total: orderData.total || 0,
    couponCode: orderData.couponCode || null,
    trackingNumber,
    estimatedDelivery: estimatedDelivery.toISOString(),
    __source: 'local',
  });
};

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],
      isLoading: false,
      hasFetched: false,

      // Create a new order
      createOrder: async (orderData) => {
        const allItemsAreMongo =
          Array.isArray(orderData?.items) &&
          orderData.items.length > 0 &&
          orderData.items.every((item) => isMongoId(item?.id));

        // If product IDs are not backend product IDs yet, keep local flow to avoid breakage.
        if (!allItemsAreMongo) {
          const newOrder = localCreateOrder(orderData);
          set((state) => ({
            orders: [newOrder, ...state.orders],
          }));

          if (newOrder.vendorItems.length > 0) {
            useCommissionStore.getState().recordCommission(newOrder.id, newOrder.vendorItems);
          }

          return newOrder;
        }

        set({ isLoading: true });
        try {
          const payload = {
            items: orderData.items.map((item) => ({
              productId: item.id,
              quantity: Number(item.quantity || 1),
              price: Number(item.price || 0),
              variant: item.variant || undefined,
            })),
            shippingAddress: orderData.shippingAddress,
            paymentMethod: orderData.paymentMethod,
            couponCode: orderData.couponCode || undefined,
            shippingOption: orderData.shippingOption || 'standard',
          };

          const response = await api.post('/user/orders', payload);
          const data = response?.data ?? response;
          const createdOrderId = data?.orderId;

          if (!createdOrderId) {
            throw new Error('Invalid order creation response from server.');
          }

          const createdOrder = await get().fetchOrderById(createdOrderId);

          set({ isLoading: false });
          return createdOrder;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchUserOrders: async (page = 1, limit = 20) => {
        set({ isLoading: true });
        try {
          const response = await api.get('/user/orders', { params: { page, limit } });
          const payload = response?.data ?? response;
          const list = Array.isArray(payload?.orders)
            ? payload.orders.map(normalizeOrder)
            : [];

          set((state) => ({
            orders: page === 1 ? list : [...state.orders, ...list],
            hasFetched: true,
            isLoading: false,
          }));

          return list;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchOrderById: async (orderId) => {
        const existing = get().orders.find((order) => String(order.id) === String(orderId));
        if (existing) return existing;

        try {
          const response = await api.get(`/user/orders/${orderId}`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);

          set((state) => ({
            orders: [normalized, ...state.orders.filter((o) => String(o.id) !== String(normalized.id))],
          }));

          return normalized;
        } catch (error) {
          return null;
        }
      },

      fetchPublicTrackingOrder: async (orderId) => {
        const existing = get().orders.find((order) => String(order.id) === String(orderId));
        if (existing) return existing;

        try {
          const response = await api.get(`/orders/track/${orderId}`);
          const payload = response?.data ?? response;
          const normalized = normalizePublicTrackingOrder(payload);

          set((state) => ({
            orders: [normalized, ...state.orders.filter((o) => String(o.id) !== String(normalized.id))],
          }));

          return normalized;
        } catch (error) {
          return null;
        }
      },

      ensureHydrated: () => {
        const state = get();
        if (!state.hasFetched && !state.isLoading) {
          state.fetchUserOrders(1, 30).catch(() => null);
        }
      },

      // Get a single order by ID
      getOrder: (orderId) => {
        get().ensureHydrated();
        const state = get();
        return state.orders.find((order) => String(order.id) === String(orderId));
      },

      // Get all orders for a user (or guest orders if userId is null)
      getAllOrders: (userId = null) => {
        get().ensureHydrated();
        const state = get();
        if (userId === null) {
          return state.orders.filter((order) => order.userId === null || order.userId === undefined);
        }
        return state.orders.filter((order) => String(order.userId) === String(userId));
      },

      // Get orders for a specific vendor
      getVendorOrders: (vendorId) => {
        const state = get();
        return state.orders.filter((order) => {
          if (!order.vendorItems) return false;
          return order.vendorItems.some(
            (vi) => String(vi.vendorId) === String(vendorId) || Number(vi.vendorId) === Number(vendorId)
          );
        });
      },

      // Get order items for a specific vendor from an order
      getVendorOrderItems: (orderId, vendorId) => {
        const order = get().getOrder(orderId);
        if (!order || !order.vendorItems) return null;

        const vendorItem = order.vendorItems.find(
          (vi) => String(vi.vendorId) === String(vendorId) || Number(vi.vendorId) === Number(vendorId)
        );
        return vendorItem || null;
      },

      // Update order status locally (used by non-user modules)
      updateOrderStatus: (orderId, newStatus) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            String(order.id) === String(orderId) ? { ...order, status: newStatus } : order
          ),
        }));
      },

      // Cancel an order
      cancelOrder: async (orderId, reason = 'Cancelled by customer') => {
        const order = get().getOrder(orderId);
        if (!order) return false;

        // Sync with backend only for server-sourced orders
        if (!order.__source || order.__source !== 'local') {
          try {
            await api.patch(`/user/orders/${orderId}/cancel`, { reason });
          } catch (error) {
            throw error;
          }
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            String(o.id) === String(orderId)
              ? { ...o, status: 'cancelled', cancelledAt: new Date().toISOString() }
              : o
          ),
        }));

        return true;
      },

      resetOrders: () => {
        set({ orders: [], hasFetched: false });
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

