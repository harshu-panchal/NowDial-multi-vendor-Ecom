import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import Commission from '../../../models/Commission.model.js';
import Settlement from '../../../models/Settlement.model.js';
import mongoose from 'mongoose';
import { createNotification } from '../../../services/notification.service.js';

// GET /api/vendor/orders
export const getVendorOrders = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const skip = (numericPage - 1) * numericLimit;

    const filter = status
        ? { vendorItems: { $elemMatch: { vendorId: req.user.id, status } } }
        : { 'vendorItems.vendorId': req.user.id };

    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(numericLimit);
    const total = await Order.countDocuments(filter);
    res.status(200).json(new ApiResponse(200, { orders, total, page: numericPage, pages: Math.ceil(total / numericLimit) }, 'Orders fetched.'));
});

// GET /api/vendor/orders/:id
export const getVendorOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idFilter = [{ orderId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
        idFilter.push({ _id: id });
    }

    const order = await Order.findOne({
        $or: idFilter,
        'vendorItems.vendorId': req.user.id,
    });
    if (!order) throw new ApiError(404, 'Order not found.');

    res.status(200).json(new ApiResponse(200, order, 'Order fetched.'));
});

// PATCH /api/vendor/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);
    const transitionMap = {
        pending: ['pending', 'processing', 'cancelled'],
        processing: ['processing', 'shipped', 'cancelled'],
        shipped: ['shipped', 'delivered'],
        delivered: ['delivered'],
        cancelled: ['cancelled'],
    };

    const { id } = req.params;
    const idFilter = [{ orderId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
        idFilter.push({ _id: id });
    }

    const order = await Order.findOne({
        $or: idFilter,
        'vendorItems.vendorId': req.user.id,
    });
    if (!order) throw new ApiError(404, 'Order not found.');
    const vendorItem = order.vendorItems.find((vi) => String(vi.vendorId) === String(req.user.id));
    if (!vendorItem) throw new ApiError(404, 'Vendor order item not found.');

    const currentStatus = String(vendorItem.status || 'pending');
    const allowedNextStatuses = transitionMap[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
        throw new ApiError(409, `Cannot move order from ${currentStatus} to ${status}.`);
    }

    // Update only this vendor's items status
    order.vendorItems = order.vendorItems.map((vi) =>
        vi.vendorId.toString() === req.user.id ? { ...vi.toObject(), status } : vi
    );
    await order.save();

    const notificationTasks = [];
    if (order.userId) {
        notificationTasks.push(
            createNotification({
                recipientId: order.userId,
                recipientType: 'user',
                title: 'Order status updated',
                message: `Your order ${order.orderId || order._id} is now ${status}.`,
                type: 'order',
                data: {
                    orderId: String(order.orderId || order._id),
                    status: String(status),
                },
            })
        );
    }

    notificationTasks.push(
        createNotification({
            recipientId: req.user.id,
            recipientType: 'vendor',
            title: 'Order status updated',
            message: `Order ${order.orderId || order._id} moved to ${status}.`,
            type: 'order',
            data: {
                orderId: String(order.orderId || order._id),
                status: String(status),
            },
        })
    );

    await Promise.allSettled(notificationTasks);

    res.status(200).json(new ApiResponse(200, order, 'Order status updated.'));
});

// GET /api/vendor/earnings
export const getEarnings = asyncHandler(async (req, res) => {
    const commissionDocs = await Commission.find({ vendorId: req.user.id })
        .populate('orderId', 'orderId status')
        .sort({ createdAt: -1 });
    const settlements = await Settlement.find({ vendorId: req.user.id }).sort({ createdAt: -1 });

    const commissions = commissionDocs.map((doc) => {
        const commission = doc.toObject();
        const orderRef = commission.orderId?._id || commission.orderId;
        const orderDisplayId = commission.orderId?.orderId || String(orderRef || '');
        return {
            ...commission,
            orderRef,
            orderDisplayId,
        };
    });

    const summary = commissions.reduce((acc, c) => {
        const status = String(c.status || 'pending');
        const orderStatus = String(c.orderId?.status || '').toLowerCase();
        const effectiveStatus = orderStatus === 'cancelled' ? 'cancelled' : status;
        const earnings = Number(c.vendorEarnings || 0);
        const commissionAmount = Number(c.commission || 0);

        // Cancelled commissions should not contribute to active earnings totals.
        if (effectiveStatus !== 'cancelled') {
            acc.totalEarnings += earnings;
            acc.totalCommission += commissionAmount;
            acc.totalOrders += 1;
        }

        if (effectiveStatus === 'pending') acc.pendingEarnings += earnings;
        if (effectiveStatus === 'paid') acc.paidEarnings += earnings;
        if (effectiveStatus === 'cancelled') acc.cancelledEarnings += earnings;
        return acc;
    }, {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        cancelledEarnings: 0,
        totalCommission: 0,
        totalOrders: 0
    });

    res.status(200).json(new ApiResponse(200, { summary, commissions, settlements }, 'Earnings fetched.'));
});
