import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as addressController from '../controllers/address.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth } from '../../../middlewares/authenticate.js';
import { authorize, enforceAccountStatus } from '../../../middlewares/authorize.js';
import { authLimiter, otpLimiter } from '../../../middlewares/rateLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import { uploadSingle } from '../../../middlewares/upload.js';
import {
    registerSchema,
    loginSchema,
    otpSchema,
    resendOtpSchema,
    refreshTokenSchema,
    logoutSchema,
    forgotPasswordSchema,
    verifyResetOtpSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema,
} from '../validators/auth.validator.js';
import {
    createAddressSchema,
    updateAddressSchema,
} from '../validators/address.validator.js';
import { placeOrderSchema } from '../validators/order.validator.js';

const router = Router();
const customerAuth = [authenticate, authorize('customer'), enforceAccountStatus];

// Auth routes
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/verify-otp', validate(otpSchema), authController.verifyOTP);
router.post('/auth/resend-otp', otpLimiter, validate(resendOtpSchema), authController.resendOTP);
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-reset-otp', authLimiter, validate(verifyResetOtpSchema), authController.verifyResetOTP);
router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/auth/logout', validate(logoutSchema), authController.logout);
router.get('/auth/profile', ...customerAuth, authController.getProfile);
router.put('/auth/profile', ...customerAuth, validate(updateProfileSchema), authController.updateProfile);
router.post('/auth/profile/avatar', ...customerAuth, uploadSingle('avatar'), authController.uploadProfileAvatar);
router.post('/auth/change-password', ...customerAuth, validate(changePasswordSchema), authController.changePassword);

// Address routes (protected)
router.get('/addresses', ...customerAuth, addressController.getAddresses);
router.post('/addresses', ...customerAuth, validate(createAddressSchema), addressController.addAddress);
router.put('/addresses/:id', ...customerAuth, validate(updateAddressSchema), addressController.updateAddress);
router.delete('/addresses/:id', ...customerAuth, addressController.deleteAddress);
router.patch('/addresses/:id/default', ...customerAuth, addressController.setDefaultAddress);

// Wishlist routes (protected)
router.get('/wishlist', ...customerAuth, wishlistController.getWishlist);
router.post('/wishlist', ...customerAuth, wishlistController.addToWishlist);
router.delete('/wishlist/:productId', ...customerAuth, wishlistController.removeFromWishlist);

// Review routes
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.post('/reviews', ...customerAuth, reviewController.addReview);
router.post('/reviews/:id/helpful', reviewController.voteHelpful);

// Order routes (optionalAuth for guest checkout)
router.post('/orders', optionalAuth, validate(placeOrderSchema), orderController.placeOrder);
router.get('/orders', ...customerAuth, orderController.getUserOrders);
router.get('/orders/:id', ...customerAuth, orderController.getOrderDetail);
router.patch('/orders/:id/cancel', ...customerAuth, orderController.cancelOrder);

export default router;
