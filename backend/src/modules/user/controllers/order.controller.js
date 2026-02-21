import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import Product from '../../../models/Product.model.js';
import Coupon from '../../../models/Coupon.model.js';
import Commission from '../../../models/Commission.model.js';
import { generateOrderId } from '../../../utils/generateOrderId.js';
import { generateTrackingNumber } from '../../../utils/generateTrackingNumber.js';
import mongoose from 'mongoose';

const normalizeVariantPart = (value) => String(value || '').trim().toLowerCase();

const toVariantPriceEntries = (variantPrices) => {
    if (!variantPrices) return [];
    if (variantPrices instanceof Map) return Array.from(variantPrices.entries());
    if (typeof variantPrices === 'object') return Object.entries(variantPrices);
    return [];
};

const resolveVariantPrice = (product, selectedVariant) => {
    const basePrice = Number(product?.price);
    if (!Number.isFinite(basePrice)) {
        throw new ApiError(400, `Invalid price configured for product ${product?.name || product?._id || ''}.`);
    }

    const size = normalizeVariantPart(selectedVariant?.size);
    const color = normalizeVariantPart(selectedVariant?.color);
    const entries = toVariantPriceEntries(product?.variants?.prices);
    if (!entries.length || (!size && !color)) return basePrice;

    const candidateKeys = [
        `${size}|${color}`,
        `${size}-${color}`,
        `${size}_${color}`,
        `${size}:${color}`,
        size && !color ? size : null,
        color && !size ? color : null,
    ].filter(Boolean);

    for (const candidate of candidateKeys) {
        const exact = entries.find(([rawKey]) => String(rawKey).trim() === candidate);
        if (exact) {
            const price = Number(exact[1]);
            if (Number.isFinite(price) && price >= 0) return price;
        }

        const normalized = entries.find(
            ([rawKey]) => normalizeVariantPart(rawKey) === normalizeVariantPart(candidate)
        );
        if (normalized) {
            const price = Number(normalized[1]);
            if (Number.isFinite(price) && price >= 0) return price;
        }
    }

    return basePrice;
};

// POST /api/user/orders
export const placeOrder = asyncHandler(async (req, res) => {
    const { items, shippingAddress, paymentMethod, couponCode, shippingOption } = req.body;
    const normalizedPaymentMethod = paymentMethod === 'cash' ? 'cod' : paymentMethod;
    const userId = req.user?.id || null;
    const rawIdempotencyKey = String(req.get('x-idempotency-key') || '').trim();
    const idempotencyKey = rawIdempotencyKey || null;
    const normalizedGuestEmail = String(shippingAddress?.email || '').trim().toLowerCase();
    const normalizedGuestPhone = String(shippingAddress?.phone || '').replace(/\D/g, '').slice(-10);
    const idempotencyScope = userId
        ? `user:${String(userId)}`
        : `guest:${normalizedGuestEmail || normalizedGuestPhone || 'anonymous'}`;

    if (idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
            .select('orderId total trackingNumber')
            .lean();
        if (existingOrder) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        orderId: existingOrder.orderId,
                        total: existingOrder.total,
                        trackingNumber: existingOrder.trackingNumber,
                        idempotentReplay: true,
                    },
                    'Duplicate order request ignored. Returning existing order.'
                )
            );
        }
    }

    // 1. Validate items and calculate subtotal
    let subtotal = 0;
    const enrichedItems = [];
    const vendorMap = {};

    for (const item of items) {
        const product = await Product.findById(item.productId).populate('vendorId', 'commissionRate storeName');
        if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
        if (product.stock === 'out_of_stock') throw new ApiError(400, `${product.name} is out of stock.`);
        if (product.stockQuantity < item.quantity) throw new ApiError(400, `Only ${product.stockQuantity} units of ${product.name} available.`);

        // Always trust server-side product pricing; never trust client-sent item.price.
        const itemPrice = resolveVariantPrice(product, item.variant);
        const itemSubtotal = itemPrice * item.quantity;
        subtotal += itemSubtotal;

        const enriched = { productId: product._id, vendorId: product.vendorId._id, name: product.name, image: product.image, price: itemPrice, quantity: item.quantity, variant: item.variant };
        enrichedItems.push(enriched);

        // Group by vendor
        const vid = product.vendorId._id.toString();
        if (!vendorMap[vid]) {
            vendorMap[vid] = { vendorId: product.vendorId._id, vendorName: product.vendorId.storeName, commissionRate: product.vendorId.commissionRate || 10, items: [], subtotal: 0 };
        }
        vendorMap[vid].items.push(enriched);
        vendorMap[vid].subtotal += itemSubtotal;
    }

    // 2. Validate coupon
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (!coupon) throw new ApiError(400, 'Invalid coupon code.');
        if (coupon.startsAt && coupon.startsAt > Date.now()) throw new ApiError(400, 'Coupon is not active yet.');
        if (coupon.expiresAt && coupon.expiresAt < Date.now()) throw new ApiError(400, 'Coupon has expired.');
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached.');
        if (subtotal < coupon.minOrderValue) throw new ApiError(400, `Minimum order value for this coupon is Rs.${coupon.minOrderValue}.`);

        if (coupon.type === 'percentage') {
            couponDiscount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
        } else if (coupon.type === 'fixed') {
            couponDiscount = coupon.value;
        }
        appliedCoupon = coupon;
    }

    // 3. Calculate shipping
    const FREE_SHIPPING_THRESHOLD = 100;
    let shipping = 0;
    if (!appliedCoupon || appliedCoupon.type !== 'freeship') {
        if (subtotal < FREE_SHIPPING_THRESHOLD) {
            shipping = shippingOption === 'express' ? 100 : 50;
        }
    }

    // 4. Calculate tax (18%)
    const tax = parseFloat(((subtotal - couponDiscount) * 0.18).toFixed(2));
    const total = parseFloat((subtotal - couponDiscount + shipping + tax).toFixed(2));

    // 5. Build vendor item groups
    const vendorItems = Object.values(vendorMap).map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        items: v.items,
        subtotal: v.subtotal,
        shipping: 0,
        tax: parseFloat((v.subtotal * 0.18).toFixed(2)),
        discount: 0,
        status: 'pending',
    }));

    // 6-9. Transactional order creation to avoid partial writes.
    let order = null;
    let idempotentReplay = false;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            if (idempotencyKey) {
                const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
                    .select('orderId total trackingNumber')
                    .session(session);
                if (existingOrder) {
                    order = existingOrder;
                    idempotentReplay = true;
                    return;
                }
            }

            const [createdOrder] = await Order.create([{
                orderId: generateOrderId(),
                userId,
                items: enrichedItems,
                vendorItems,
                shippingAddress,
                paymentMethod: normalizedPaymentMethod,
                // Keep every new order pending until gateway/webhook confirmation is implemented.
                paymentStatus: 'pending',
                subtotal,
                shipping,
                tax,
                discount: couponDiscount,
                total,
                couponCode: couponCode?.toUpperCase(),
                couponDiscount,
                trackingNumber: generateTrackingNumber(),
                estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
                idempotencyKey: idempotencyKey || undefined,
                idempotencyScope: idempotencyKey ? idempotencyScope : undefined,
            }], { session });
            order = createdOrder;

            // 7. Deduct stock atomically to prevent oversell under concurrent checkout.
            for (const item of enrichedItems) {
                const updatedProduct = await Product.findOneAndUpdate(
                    {
                        _id: item.productId,
                        stock: { $ne: 'out_of_stock' },
                        stockQuantity: { $gte: Number(item.quantity || 0) },
                    },
                    { $inc: { stockQuantity: -Number(item.quantity || 0) } },
                    { new: true, session }
                );

                if (!updatedProduct) {
                    throw new ApiError(409, `Insufficient stock while processing ${item.name}. Please refresh and try again.`);
                }

                const nextStockState =
                    updatedProduct.stockQuantity <= 0
                        ? 'out_of_stock'
                        : (updatedProduct.stockQuantity <= updatedProduct.lowStockThreshold ? 'low_stock' : 'in_stock');

                await Product.updateOne(
                    { _id: updatedProduct._id },
                    { $set: { stock: nextStockState } },
                    { session }
                );
            }

            // 8. Record commissions
            const commissionDocs = Object.values(vendorMap).map((v) => ({
                orderId: order._id,
                vendorId: v.vendorId,
                vendorName: v.vendorName,
                subtotal: v.subtotal,
                commissionRate: v.commissionRate,
                commission: parseFloat(((v.subtotal * v.commissionRate) / 100).toFixed(2)),
                vendorEarnings: parseFloat((v.subtotal - (v.subtotal * v.commissionRate) / 100).toFixed(2)),
            }));
            await Commission.insertMany(commissionDocs, { session });

            // 9. Increment coupon usage
            if (appliedCoupon) {
                await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } }, { session });
            }
        });
    } catch (err) {
        if (idempotencyKey && err?.code === 11000) {
            const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
                .select('orderId total trackingNumber')
                .lean();
            if (existingOrder) {
                order = existingOrder;
                idempotentReplay = true;
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    } finally {
        await session.endSession();
    }

    const responseStatus = idempotentReplay ? 200 : 201;
    const responseMessage = idempotentReplay
        ? 'Duplicate order request ignored. Returning existing order.'
        : 'Order placed successfully.';
    res.status(responseStatus).json(
        new ApiResponse(
            responseStatus,
            {
                orderId: order.orderId,
                total: order.total,
                trackingNumber: order.trackingNumber,
                ...(idempotentReplay ? { idempotentReplay: true } : {}),
            },
            responseMessage
        )
    );
});

// GET /api/user/orders
export const getUserOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Order.countDocuments({ userId: req.user.id });
    res.status(200).json(new ApiResponse(200, { orders, total, page: Number(page), pages: Math.ceil(total / limit) }, 'Orders fetched.'));
});

// GET /api/user/orders/:id
export const getOrderDetail = asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.id, userId: req.user.id });
    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order detail fetched.'));
});

// PATCH /api/user/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.id, userId: req.user.id });
    if (!order) throw new ApiError(404, 'Order not found.');
    if (!['pending', 'processing'].includes(order.status)) throw new ApiError(400, 'Order cannot be cancelled at this stage.');

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by customer';
    await order.save();

    // Restore stock and status
    for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        product.stockQuantity += Number(item.quantity || 0);
        if (product.stockQuantity <= 0) product.stock = 'out_of_stock';
        else if (product.stockQuantity <= product.lowStockThreshold) product.stock = 'low_stock';
        else product.stock = 'in_stock';
        await product.save();
    }

    res.status(200).json(new ApiResponse(200, null, 'Order cancelled successfully.'));
});
