import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import mongoose from 'mongoose';

// GET /api/delivery/orders
export const getAssignedOrders = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { deliveryBoyId: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, orders, 'Assigned orders fetched.'));
});

// GET /api/delivery/orders/:id
export const getOrderDetail = asyncHandler(async (req, res) => {
    const query = {
        deliveryBoyId: req.user.id,
        $or: [{ orderId: req.params.id }],
    };
    if (mongoose.isValidObjectId(req.params.id)) {
        query.$or.push({ _id: req.params.id });
    }

    const order = await Order.findOne(query);
    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order detail fetched.'));
});

// PATCH /api/delivery/orders/:id/status
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ['shipped', 'delivered'];
    if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);

    const query = {
        deliveryBoyId: req.user.id,
        $or: [{ orderId: req.params.id }],
    };
    if (mongoose.isValidObjectId(req.params.id)) {
        query.$or.push({ _id: req.params.id });
    }

    const order = await Order.findOne(query);
    if (!order) throw new ApiError(404, 'Order not found.');

    // Server-side transition guard (frontend guard already exists).
    const transitionAllowed =
        (status === 'shipped' && ['pending', 'processing'].includes(order.status)) ||
        (status === 'delivered' && order.status === 'shipped');
    if (!transitionAllowed) {
        throw new ApiError(409, `Cannot move order from ${order.status} to ${status}.`);
    }

    order.status = status;
    if (status === 'delivered') {
        order.deliveredAt = new Date();
    }
    await order.save();

    res.status(200).json(new ApiResponse(200, order, 'Delivery status updated.'));
});
