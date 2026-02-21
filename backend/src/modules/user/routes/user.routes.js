import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as addressController from '../controllers/address.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth } from '../../../middlewares/authenticate.js';
import { authLimiter, otpLimiter } from '../../../middlewares/rateLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import { uploadSingle } from '../../../middlewares/upload.js';
import {
    registerSchema,
    loginSchema,
    otpSchema,
    resendOtpSchema,
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

// Auth routes
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/verify-otp', validate(otpSchema), authController.verifyOTP);
router.post('/auth/resend-otp', otpLimiter, validate(resendOtpSchema), authController.resendOTP);
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-reset-otp', authLimiter, validate(verifyResetOtpSchema), authController.verifyResetOTP);
router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/auth/profile/avatar', authenticate, uploadSingle('avatar'), authController.uploadProfileAvatar);
router.post('/auth/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// Address routes (protected)
router.get('/addresses', authenticate, addressController.getAddresses);
router.post('/addresses', authenticate, validate(createAddressSchema), addressController.addAddress);
router.put('/addresses/:id', authenticate, validate(updateAddressSchema), addressController.updateAddress);
router.delete('/addresses/:id', authenticate, addressController.deleteAddress);
router.patch('/addresses/:id/default', authenticate, addressController.setDefaultAddress);

// Wishlist routes (protected)
router.get('/wishlist', authenticate, wishlistController.getWishlist);
router.post('/wishlist', authenticate, wishlistController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, wishlistController.removeFromWishlist);

// Review routes
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.post('/reviews', authenticate, reviewController.addReview);
router.post('/reviews/:id/helpful', reviewController.voteHelpful);

// Order routes (optionalAuth for guest checkout)
router.post('/orders', optionalAuth, validate(placeOrderSchema), orderController.placeOrder);
router.get('/orders', authenticate, orderController.getUserOrders);
router.get('/orders/:id', authenticate, orderController.getOrderDetail);
router.patch('/orders/:id/cancel', authenticate, orderController.cancelOrder);

export default router;
