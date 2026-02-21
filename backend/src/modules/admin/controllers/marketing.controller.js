import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import Coupon from '../../../models/Coupon.model.js';
import Banner from '../../../models/Banner.model.js';
import Campaign from '../../../models/Campaign.model.js';

const COUPON_TYPES = new Set(['percentage', 'fixed', 'freeship']);

const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const toBooleanOrNull = (value) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return null;
};

const toValidDateOrNull = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatCoupon = (couponDoc) => {
    const coupon = couponDoc.toObject ? couponDoc.toObject() : couponDoc;
    return {
        ...coupon,
        minPurchase: coupon.minOrderValue ?? 0,
        startDate: coupon.startsAt ?? null,
        endDate: coupon.expiresAt ?? null,
        status: coupon.isActive ? 'active' : 'inactive',
    };
};

const normalizeCouponPayload = (payload, { partial = false } = {}) => {
    const normalized = {};

    if (payload.code !== undefined) {
        const code = String(payload.code || '').trim().toUpperCase();
        if (!code) throw new ApiError(400, 'Coupon code is required');
        normalized.code = code;
    } else if (!partial) {
        throw new ApiError(400, 'Coupon code is required');
    }

    if (payload.name !== undefined) {
        normalized.name = String(payload.name || '').trim();
    }

    if (payload.type !== undefined) {
        const type = String(payload.type || '').trim().toLowerCase();
        if (!COUPON_TYPES.has(type)) {
            throw new ApiError(400, 'Coupon type must be percentage, fixed, or freeship');
        }
        normalized.type = type;
    } else if (!partial) {
        throw new ApiError(400, 'Coupon type is required');
    }

    if (payload.value !== undefined) {
        const value = toFiniteNumber(payload.value);
        if (value === null || value < 0) throw new ApiError(400, 'Coupon value must be a non-negative number');
        normalized.value = value;
    } else if (!partial) {
        throw new ApiError(400, 'Coupon value is required');
    }

    if (payload.minOrderValue !== undefined || payload.minPurchase !== undefined) {
        const minOrderValue = payload.minOrderValue ?? payload.minPurchase;
        const parsed = toFiniteNumber(minOrderValue);
        if (parsed === null || parsed < 0) throw new ApiError(400, 'Minimum purchase must be a non-negative number');
        normalized.minOrderValue = parsed;
    } else if (!partial) {
        normalized.minOrderValue = 0;
    }

    if (payload.maxDiscount !== undefined) {
        if (payload.maxDiscount === '' || payload.maxDiscount === null) {
            normalized.maxDiscount = undefined;
        } else {
            const maxDiscount = toFiniteNumber(payload.maxDiscount);
            if (maxDiscount === null || maxDiscount < 0) throw new ApiError(400, 'Max discount must be a non-negative number');
            normalized.maxDiscount = maxDiscount;
        }
    }

    if (payload.usageLimit !== undefined) {
        if (payload.usageLimit === '' || payload.usageLimit === null) {
            normalized.usageLimit = null;
        } else {
            const usageLimit = Number(payload.usageLimit);
            if (!Number.isInteger(usageLimit)) throw new ApiError(400, 'Usage limit must be an integer');
            normalized.usageLimit = usageLimit < 0 ? null : usageLimit;
        }
    }

    if (payload.isActive !== undefined) {
        const isActive = toBooleanOrNull(payload.isActive);
        if (isActive === null) throw new ApiError(400, 'isActive must be a boolean');
        normalized.isActive = isActive;
    } else if (payload.status !== undefined) {
        normalized.isActive = String(payload.status).toLowerCase() === 'active';
    } else if (!partial) {
        normalized.isActive = true;
    }

    if (payload.startsAt !== undefined || payload.startDate !== undefined) {
        const startsAt = toValidDateOrNull(payload.startsAt ?? payload.startDate);
        if ((payload.startsAt ?? payload.startDate) && !startsAt) throw new ApiError(400, 'Start date is invalid');
        normalized.startsAt = startsAt;
    }

    if (payload.expiresAt !== undefined || payload.endDate !== undefined) {
        const expiresAt = toValidDateOrNull(payload.expiresAt ?? payload.endDate);
        if ((payload.expiresAt ?? payload.endDate) && !expiresAt) throw new ApiError(400, 'End date is invalid');
        normalized.expiresAt = expiresAt;
    }

    return normalized;
};

// ─── Coupons (Promo Codes) ──────────────────────────────────────────────────
export const getAllCoupons = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);
    const query = {};
    const now = new Date();

    if (status === 'active') {
        query.isActive = true;
        query.$and = [
            { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
            { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] }
        ];
    } else if (status === 'inactive') {
        query.isActive = false;
    } else if (status === 'expired') {
        query.expiresAt = { $lt: now };
    } else if (status === 'upcoming') {
        query.startsAt = { $gt: now };
    }

    const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit);

    const count = await Coupon.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            coupons: coupons.map(formatCoupon),
            pagination: {
                total: count,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(count / parsedLimit)
            }
        }, 'Coupons fetched successfully')
    );
});

export const createCoupon = asyncHandler(async (req, res) => {
    const payload = normalizeCouponPayload(req.body);

    if (payload.startsAt && payload.expiresAt && payload.startsAt >= payload.expiresAt) {
        throw new ApiError(400, 'End date must be after start date');
    }

    const existingCoupon = await Coupon.findOne({ code: payload.code });
    if (existingCoupon) throw new ApiError(409, 'Coupon code already exists');

    const coupon = await Coupon.create(payload);
    return res.status(201).json(new ApiResponse(201, formatCoupon(coupon), 'Coupon created successfully'));
});

export const updateCoupon = asyncHandler(async (req, res) => {
    const payload = normalizeCouponPayload(req.body, { partial: true });

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');

    if (payload.code && payload.code !== coupon.code) {
        const existingCoupon = await Coupon.findOne({ code: payload.code, _id: { $ne: coupon._id } });
        if (existingCoupon) throw new ApiError(409, 'Coupon code already exists');
    }

    const effectiveStart = payload.startsAt !== undefined ? payload.startsAt : coupon.startsAt;
    const effectiveEnd = payload.expiresAt !== undefined ? payload.expiresAt : coupon.expiresAt;
    if (effectiveStart && effectiveEnd && effectiveStart >= effectiveEnd) {
        throw new ApiError(400, 'End date must be after start date');
    }

    Object.assign(coupon, payload);
    await coupon.save();

    return res.status(200).json(new ApiResponse(200, formatCoupon(coupon), 'Coupon updated successfully'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    return res.status(200).json(new ApiResponse(200, null, 'Coupon deleted successfully'));
});

// ─── Banners ──────────────────────────────────────────────────────────────────
export const getAllBanners = asyncHandler(async (req, res) => {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, banners, 'Banners fetched successfully'));
});

export const createBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.create(req.body);
    return res.status(201).json(new ApiResponse(201, banner, 'Banner created successfully'));
});

export const updateBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) throw new ApiError(404, 'Banner not found');
    return res.status(200).json(new ApiResponse(200, banner, 'Banner updated successfully'));
});

export const deleteBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    return res.status(200).json(new ApiResponse(200, null, 'Banner deleted successfully'));
});

// ─── Campaigns ───────────────────────────────────────────────────────────────
export const getAllCampaigns = asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, campaigns, 'Campaigns fetched successfully'));
});

export const createCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.create(req.body);
    return res.status(201).json(new ApiResponse(201, campaign, 'Campaign created successfully'));
});

export const updateCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) throw new ApiError(404, 'Campaign not found');
    return res.status(200).json(new ApiResponse(200, campaign, 'Campaign updated successfully'));
});

export const deleteCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) throw new ApiError(404, 'Campaign not found');
    return res.status(200).json(new ApiResponse(200, null, 'Campaign deleted successfully'));
});
