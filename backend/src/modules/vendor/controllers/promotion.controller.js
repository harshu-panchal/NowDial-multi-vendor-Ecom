import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import VendorPromotion from '../../../models/VendorPromotion.model.js';

const PROMO_TYPES = new Set(['discount', 'flash_sale', 'promo_code']);
const DISCOUNT_TYPES = new Set(['percentage', 'fixed']);
const STATUSES = new Set(['active', 'inactive', 'expired']);

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (status, endDate) => {
    if (status === 'expired') return 'expired';
    if (endDate && new Date(endDate).getTime() < Date.now()) return 'expired';
    return status === 'inactive' ? 'inactive' : 'active';
};

const buildPayload = (body, { partial = false } = {}) => {
    const payload = {};

    if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw new ApiError(400, 'Promotion name is required.');
        payload.name = name;
    } else if (!partial) {
        throw new ApiError(400, 'Promotion name is required.');
    }

    if (body.type !== undefined) {
        const type = String(body.type || '').trim();
        if (!PROMO_TYPES.has(type)) {
            throw new ApiError(400, 'Invalid promotion type.');
        }
        payload.type = type;
    } else if (!partial) {
        payload.type = 'discount';
    }

    if (body.code !== undefined) {
        payload.code = String(body.code || '').trim().toUpperCase() || undefined;
    }

    if (body.description !== undefined) {
        payload.description = String(body.description || '').trim();
    }

    if (body.discountType !== undefined) {
        const discountType = String(body.discountType || '').trim();
        if (!DISCOUNT_TYPES.has(discountType)) {
            throw new ApiError(400, 'Invalid discount type.');
        }
        payload.discountType = discountType;
    } else if (!partial) {
        payload.discountType = 'percentage';
    }

    if (body.discountValue !== undefined) {
        const discountValue = toNumber(body.discountValue, NaN);
        if (!Number.isFinite(discountValue) || discountValue < 0) {
            throw new ApiError(400, 'Discount value must be a non-negative number.');
        }
        payload.discountValue = discountValue;
    } else if (!partial) {
        throw new ApiError(400, 'Discount value is required.');
    }

    if (body.minPurchase !== undefined) {
        const minPurchase = toNumber(body.minPurchase, NaN);
        if (!Number.isFinite(minPurchase) || minPurchase < 0) {
            throw new ApiError(400, 'Minimum purchase must be a non-negative number.');
        }
        payload.minPurchase = minPurchase;
    } else if (!partial) {
        payload.minPurchase = 0;
    }

    if (body.maxDiscount !== undefined) {
        const maxDiscount = toNumber(body.maxDiscount, NaN);
        if (!Number.isFinite(maxDiscount) || maxDiscount < 0) {
            throw new ApiError(400, 'Maximum discount must be a non-negative number.');
        }
        payload.maxDiscount = maxDiscount;
    } else if (!partial) {
        payload.maxDiscount = 0;
    }

    if (body.startDate !== undefined) {
        const startDate = new Date(body.startDate);
        if (Number.isNaN(startDate.getTime())) throw new ApiError(400, 'Invalid start date.');
        payload.startDate = startDate;
    } else if (!partial) {
        throw new ApiError(400, 'Start date is required.');
    }

    if (body.endDate !== undefined) {
        const endDate = new Date(body.endDate);
        if (Number.isNaN(endDate.getTime())) throw new ApiError(400, 'Invalid end date.');
        payload.endDate = endDate;
    } else if (!partial) {
        throw new ApiError(400, 'End date is required.');
    }

    if (payload.startDate && payload.endDate && payload.startDate >= payload.endDate) {
        throw new ApiError(400, 'End date must be after start date.');
    }

    if (body.usageLimit !== undefined) {
        const usageLimit = Math.max(0, Math.floor(toNumber(body.usageLimit, 0)));
        payload.usageLimit = usageLimit;
    } else if (!partial) {
        payload.usageLimit = 0;
    }

    if (body.status !== undefined) {
        const status = String(body.status || '').trim();
        if (!STATUSES.has(status)) throw new ApiError(400, 'Invalid status.');
        payload.status = status;
    } else if (!partial) {
        payload.status = 'active';
    }

    if (body.productIds !== undefined) {
        payload.productIds = Array.isArray(body.productIds) ? body.productIds : [];
    } else if (!partial) {
        payload.productIds = [];
    }

    return payload;
};

export const getVendorPromotions = asyncHandler(async (req, res) => {
    const { search = '', status = 'all' } = req.query;
    const query = { vendorId: req.user.id };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
        ];
    }

    if (status && status !== 'all') {
        query.status = status;
    }

    const promotions = await VendorPromotion.find(query).sort({ createdAt: -1 });
    const normalized = promotions.map((promotion) => {
        const promo = promotion.toObject();
        promo.status = normalizeStatus(promo.status, promo.endDate);
        return promo;
    });

    res.status(200).json(new ApiResponse(200, normalized, 'Promotions fetched.'));
});

export const createVendorPromotion = asyncHandler(async (req, res) => {
    const payload = buildPayload(req.body);
    if (payload.type === 'promo_code' && !payload.code) {
        throw new ApiError(400, 'Promo code is required for promo_code type.');
    }
    payload.vendorId = req.user.id;
    payload.status = normalizeStatus(payload.status, payload.endDate);

    const promotion = await VendorPromotion.create(payload);
    res.status(201).json(new ApiResponse(201, promotion, 'Promotion created.'));
});

export const updateVendorPromotion = asyncHandler(async (req, res) => {
    const promotion = await VendorPromotion.findOne({ _id: req.params.id, vendorId: req.user.id });
    if (!promotion) throw new ApiError(404, 'Promotion not found.');

    const payload = buildPayload(req.body, { partial: true });
    Object.assign(promotion, payload);
    if (promotion.type === 'promo_code' && !promotion.code) {
        throw new ApiError(400, 'Promo code is required for promo_code type.');
    }
    promotion.status = normalizeStatus(promotion.status, promotion.endDate);

    if (promotion.startDate && promotion.endDate && promotion.startDate >= promotion.endDate) {
        throw new ApiError(400, 'End date must be after start date.');
    }

    await promotion.save();
    res.status(200).json(new ApiResponse(200, promotion, 'Promotion updated.'));
});

export const deleteVendorPromotion = asyncHandler(async (req, res) => {
    const deleted = await VendorPromotion.findOneAndDelete({
        _id: req.params.id,
        vendorId: req.user.id,
    });
    if (!deleted) throw new ApiError(404, 'Promotion not found.');

    res.status(200).json(new ApiResponse(200, null, 'Promotion deleted.'));
});
