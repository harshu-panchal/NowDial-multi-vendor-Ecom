import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Vendor from '../models/Vendor.model.js';
import Coupon from '../models/Coupon.model.js';
import Banner from '../models/Banner.model.js';

const router = Router();

const toPublicVendor = (vendorDoc) => {
    const vendor = typeof vendorDoc?.toObject === 'function'
        ? vendorDoc.toObject()
        : (vendorDoc || {});

    return {
        ...vendor,
        password: undefined,
        otp: undefined,
        otpExpiry: undefined,
        bankDetails: undefined,
        commissionRate: undefined,
    };
};

// GET /api/products — list with filters
const listProducts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        category,
        brand,
        vendor,
        search,
        q,
        sort = 'newest',
        flashSale,
        isNew,
        minPrice,
        maxPrice
    } = req.query;
    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    if (category) {
        const categoryId = String(category);
        const childCategories = await Category.find({ parentId: categoryId }).select('_id');
        const categoryIds = [categoryId, ...childCategories.map((cat) => String(cat._id))];
        filter.categoryId = { $in: categoryIds };
    }
    if (brand) filter.brandId = brand;
    if (vendor) filter.vendorId = vendor;
    if (flashSale === 'true') filter.flashSale = true;
    if (isNew === 'true') filter.isNew = true;
    if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
    const searchQuery = String(search || q || '').trim();
    if (searchQuery) filter.$text = { $search: searchQuery };

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, popular: { reviewCount: -1 }, rating: { rating: -1 } };

    const products = await Product.find(filter).populate('categoryId', 'name').populate('brandId', 'name').populate('vendorId', 'storeName').sort(sortMap[sort] || { createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Product.countDocuments(filter);

    res.status(200).json(new ApiResponse(200, { products, total, page: Number(page), pages: Math.ceil(total / limit) }, 'Products fetched.'));
});

router.get('/', listProducts);
router.get('/products', listProducts);

// GET /api/products/flash-sale
router.get('/flash-sale', asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true, flashSale: true }).limit(20);
    res.status(200).json(new ApiResponse(200, products, 'Flash sale products.'));
}));

// GET /api/products/new-arrivals
router.get('/new-arrivals', asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true, isNew: true }).sort({ createdAt: -1 }).limit(20);
    res.status(200).json(new ApiResponse(200, products, 'New arrivals.'));
}));

// GET /api/products/popular
router.get('/popular', asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true }).sort({ reviewCount: -1, rating: -1 }).limit(10);
    res.status(200).json(new ApiResponse(200, products, 'Popular products.'));
}));

// GET /api/products/similar/:id
router.get('/similar/:id', asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found.');
    const similar = await Product.find({ isActive: true, _id: { $ne: product._id }, categoryId: product.categoryId }).limit(6);
    res.status(200).json(new ApiResponse(200, similar, 'Similar products.'));
}));

// GET /api/products/:id
router.get('/:id', asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name').populate('brandId', 'name').populate('vendorId', 'storeName storeLogo rating');
    if (!product) throw new ApiError(404, 'Product not found.');
    res.status(200).json(new ApiResponse(200, product, 'Product detail.'));
}));

// GET /api/categories (public)
router.get('/categories/all', asyncHandler(async (req, res) => {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(new ApiResponse(200, categories, 'Categories fetched.'));
}));

// GET /api/brands (public)
router.get('/brands/all', asyncHandler(async (req, res) => {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(new ApiResponse(200, brands, 'Brands fetched.'));
}));

// GET /api/vendors/all (public)
router.get('/vendors/all', asyncHandler(async (req, res) => {
    const { status = 'approved', page = 1, limit = 50, search } = req.query;
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 50, 1);
    const skip = (numericPage - 1) * numericLimit;
    const filter = {};

    if (status && status !== 'all') {
        filter.status = status;
    }

    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
        const safeRegex = new RegExp(trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: safeRegex }, { email: safeRegex }, { storeName: safeRegex }];
    }

    const vendors = await Vendor.find(filter)
        .select('-password -otp -otpExpiry')
        .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(numericLimit);
    const total = await Vendor.countDocuments(filter);

    res.status(200).json(new ApiResponse(200, {
        vendors: vendors.map(toPublicVendor),
        total,
        page: numericPage,
        pages: Math.ceil(total / numericLimit)
    }, 'Vendors fetched.'));
}));

// GET /api/vendors/:id (public)
router.get('/vendors/:id', asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!vendor) throw new ApiError(404, 'Vendor not found.');
    res.status(200).json(new ApiResponse(200, toPublicVendor(vendor), 'Vendor detail fetched.'));
}));

// GET /api/vendors/:id/products (public)
router.get('/vendors/:id/products', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (numericPage - 1) * numericLimit;

    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        'price-asc': { price: 1 },
        'price-desc': { price: -1 },
        popular: { reviewCount: -1 },
        rating: { rating: -1 },
    };

    const filter = { isActive: true, vendorId: req.params.id };
    const products = await Product.find(filter)
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .populate('vendorId', 'storeName')
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(numericLimit);
    const total = await Product.countDocuments(filter);

    res.status(200).json(new ApiResponse(200, {
        products,
        total,
        page: numericPage,
        pages: Math.ceil(total / numericLimit)
    }, 'Vendor products fetched.'));
}));

// POST /api/coupons/validate
router.post('/coupons/validate', asyncHandler(async (req, res) => {
    const { code, cartTotal } = req.body;
    const coupon = await Coupon.findOne({ code: code?.toUpperCase(), isActive: true });
    if (!coupon) throw new ApiError(400, 'Invalid coupon code.');
    if (coupon.startsAt && coupon.startsAt > Date.now()) throw new ApiError(400, 'Coupon is not active yet.');
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) throw new ApiError(400, 'Coupon has expired.');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached.');
    if (cartTotal < coupon.minOrderValue) throw new ApiError(400, `Minimum order value for this coupon is Rs.${coupon.minOrderValue}.`);

    let discount = 0;
    if (coupon.type === 'percentage') {
        discount = (cartTotal * coupon.value) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === 'fixed') {
        discount = coupon.value;
    }

    res.status(200).json(new ApiResponse(200, { coupon: { code: coupon.code, type: coupon.type, value: coupon.value }, discount }, 'Coupon is valid.'));
}));

// GET /api/banners
router.get('/banners', asyncHandler(async (req, res) => {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    const banners = await Banner.find(filter).sort({ order: 1 });
    res.status(200).json(new ApiResponse(200, banners, 'Banners fetched.'));
}));

// GET /api/orders/track/:id (public order tracking)
router.get('/orders/track/:id', asyncHandler(async (req, res) => {
    const { default: Order } = await import('../models/Order.model.js');
    const order = await Order.findOne({ orderId: req.params.id }).select('orderId status trackingNumber estimatedDelivery deliveredAt createdAt shippingAddress');
    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order tracking info.'));
}));

export default router;
