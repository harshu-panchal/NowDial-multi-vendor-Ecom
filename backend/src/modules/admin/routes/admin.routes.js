import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as vendorController from '../controllers/vendor.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as catalogController from '../controllers/catalog.controller.js';
import * as customerController from '../controllers/customer.controller.js';
import * as deliveryController from '../controllers/delivery.controller.js';
import * as returnController from '../controllers/return.controller.js';
import * as supportController from '../controllers/support.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import * as reportController from '../controllers/report.controller.js';
import * as marketingController from '../controllers/marketing.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { authLimiter } from '../../../middlewares/rateLimiter.js';
import { uploadSingle } from '../../../middlewares/upload.js';

const router = Router();
const adminAuth = [authenticate, authorize('admin', 'superadmin')];

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/profile', ...adminAuth, authController.getProfile);

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/dashboard', ...adminAuth, analyticsController.getDashboardStats);
router.get('/analytics/revenue', ...adminAuth, analyticsController.getRevenueData);
router.get('/analytics/order-status', ...adminAuth, analyticsController.getOrderStatusBreakdown);
router.get('/analytics/top-products', ...adminAuth, analyticsController.getTopProducts);
router.get('/analytics/customer-growth', ...adminAuth, analyticsController.getCustomerGrowth);
router.get('/analytics/recent-orders', ...adminAuth, analyticsController.getRecentOrders);
router.get('/analytics/sales', ...adminAuth, analyticsController.getSalesData);
router.get('/analytics/finance-summary', ...adminAuth, analyticsController.getFinancialSummary);
router.get('/analytics/inventory-stats', ...adminAuth, analyticsController.getInventoryStats);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', ...adminAuth, orderController.getAllOrders);
router.get('/orders/:id', ...adminAuth, orderController.getOrderById);
router.patch('/orders/:id/status', ...adminAuth, orderController.updateOrderStatus);
router.patch('/orders/:id/assign-delivery', ...adminAuth, orderController.assignDeliveryBoy);
router.delete('/orders/:id', ...adminAuth, orderController.deleteOrder);

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products', ...adminAuth, catalogController.getAllProducts);
router.get('/products/:id', ...adminAuth, catalogController.getProductById);
router.post('/products', ...adminAuth, catalogController.createProduct);

router.put('/products/:id', ...adminAuth, catalogController.updateProduct);
router.delete('/products/:id', ...adminAuth, catalogController.deleteProduct);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', ...adminAuth, catalogController.getAllCategories);
router.post('/categories', ...adminAuth, catalogController.createCategory);
router.put('/categories/:id', ...adminAuth, catalogController.updateCategory);
router.delete('/categories/:id', ...adminAuth, catalogController.deleteCategory);

// ─── Brands ───────────────────────────────────────────────────────────────────
router.get('/brands', ...adminAuth, catalogController.getAllBrands);
router.post('/brands', ...adminAuth, catalogController.createBrand);
router.put('/brands/:id', ...adminAuth, catalogController.updateBrand);
router.delete('/brands/:id', ...adminAuth, catalogController.deleteBrand);

// ─── Vendors ──────────────────────────────────────────────────────────────────
router.get('/vendors', ...adminAuth, vendorController.getAllVendors);
router.get('/vendors/pending', ...adminAuth, (req, res, next) => { req.query.status = 'pending'; next(); }, vendorController.getAllVendors);
router.get('/vendors/:id', ...adminAuth, vendorController.getVendorDetail);
router.patch('/vendors/:id/status', ...adminAuth, vendorController.updateVendorStatus);
router.patch('/vendors/:id/commission', ...adminAuth, vendorController.updateCommissionRate);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', ...adminAuth, customerController.getAllCustomers);
router.get('/customers/:id', ...adminAuth, customerController.getCustomerById);
router.put('/customers/:id', ...adminAuth, customerController.updateCustomerDetail);
router.patch('/customers/:id/status', ...adminAuth, customerController.updateCustomerStatus);
router.delete('/customers/:customerId/addresses/:addressId', ...adminAuth, customerController.deleteCustomerAddress);

// ─── Delivery ─────────────────────────────────────────────────────────────────
router.get('/delivery-boys', ...adminAuth, deliveryController.getAllDeliveryBoys);
router.post('/delivery-boys', ...adminAuth, deliveryController.createDeliveryBoy);
router.get('/delivery-boys/:id', ...adminAuth, deliveryController.getDeliveryBoyById);
router.put('/delivery-boys/:id', ...adminAuth, deliveryController.updateDeliveryBoy);
router.delete('/delivery-boys/:id', ...adminAuth, deliveryController.deleteDeliveryBoy);
router.patch('/delivery-boys/:id/status', ...adminAuth, deliveryController.updateDeliveryBoyStatus);
router.patch('/delivery-boys/:id/application-status', ...adminAuth, deliveryController.updateDeliveryBoyApplicationStatus);
router.post('/delivery-boys/:id/settle-cash', ...adminAuth, deliveryController.settleCash);

// ─── Return Requests ──────────────────────────────────────────────────────────
router.get('/return-requests', ...adminAuth, returnController.getAllReturnRequests);
router.get('/return-requests/:id', ...adminAuth, returnController.getReturnRequestById);
router.patch('/return-requests/:id/status', ...adminAuth, returnController.updateReturnRequestStatus);

// ─── Support Tickets ──────────────────────────────────────────────────────────
router.get('/support/tickets', ...adminAuth, supportController.getAllTickets);
router.get('/support/tickets/:id', ...adminAuth, supportController.getTicketById);
router.patch('/support/tickets/:id/status', ...adminAuth, supportController.updateTicketStatus);
router.post('/support/tickets/:id/messages', ...adminAuth, supportController.addTicketMessage);
router.get('/support/ticket-types', ...adminAuth, supportController.getAllTicketTypes);
router.post('/support/ticket-types', ...adminAuth, supportController.createTicketType);
router.put('/support/ticket-types/:id', ...adminAuth, supportController.updateTicketType);
router.delete('/support/ticket-types/:id', ...adminAuth, supportController.deleteTicketType);

// ─── Product Reviews ──────────────────────────────────────────────────────────
router.get('/reviews', ...adminAuth, reviewController.getAllReviews);
router.patch('/reviews/:id/status', ...adminAuth, reviewController.updateReviewStatus);
router.delete('/reviews/:id', ...adminAuth, reviewController.deleteReview);
router.post('/uploads/image', ...adminAuth, uploadSingle('image'), uploadController.uploadImage);

// ─── Marketing & Promotions ──────────────────────────────────────────────────
// Coupons
router.get('/marketing/coupons', ...adminAuth, marketingController.getAllCoupons);
router.post('/marketing/coupons', ...adminAuth, marketingController.createCoupon);
router.put('/marketing/coupons/:id', ...adminAuth, marketingController.updateCoupon);
router.delete('/marketing/coupons/:id', ...adminAuth, marketingController.deleteCoupon);

// Banners
router.get('/marketing/banners', ...adminAuth, marketingController.getAllBanners);
router.post('/marketing/banners', ...adminAuth, marketingController.createBanner);
router.put('/marketing/banners/:id', ...adminAuth, marketingController.updateBanner);
router.delete('/marketing/banners/:id', ...adminAuth, marketingController.deleteBanner);

// Campaigns
router.get('/marketing/campaigns', ...adminAuth, marketingController.getAllCampaigns);
router.post('/marketing/campaigns', ...adminAuth, marketingController.createCampaign);
router.put('/marketing/campaigns/:id', ...adminAuth, marketingController.updateCampaign);
router.delete('/marketing/campaigns/:id', ...adminAuth, marketingController.deleteCampaign);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/sales', ...adminAuth, reportController.getSalesReport);
router.get('/reports/inventory', ...adminAuth, reportController.getInventoryReport);

// ─── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', ...adminAuth, notificationController.getAdminNotifications);
router.put('/notifications/:id/read', ...adminAuth, notificationController.markAsRead);
router.put('/notifications/read-all', ...adminAuth, notificationController.markAllAsRead);

export default router;
