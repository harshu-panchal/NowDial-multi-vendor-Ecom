import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import User from '../../../models/User.model.js';
import { createNotification } from '../../../services/notification.service.js';

// GET /api/admin/orders
export const getAllOrders = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, search, startDate, endDate, userId } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 20;
    const skip = (numericPage - 1) * numericLimit;
    const filter = { isDeleted: { $ne: true } };

    if (status && status !== 'all') filter.status = status;
    if (search) {
        const regex = new RegExp(search, 'i');
        const matchedUsers = await User.find({
            $or: [{ name: regex }, { email: regex }, { phone: regex }]
        }).select('_id').limit(200).lean();
        const matchedUserIds = matchedUsers.map((u) => u._id);

        filter.$or = [
            { orderId: regex },
            { 'shippingAddress.name': regex },
            { 'shippingAddress.email': regex },
            ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : []),
        ];
    }
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    if (req.query.vendorId) {
        filter['vendorItems.vendorId'] = req.query.vendorId;
    }
    if (userId) {
        filter.userId = userId;
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate('userId', 'name email phone')
            .populate('deliveryBoyId', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Order.countDocuments(filter),
    ]);

    res.status(200).json(new ApiResponse(200, {
        orders,
        total,
        page: numericPage,
        pages: Math.ceil(total / numericLimit),
    }, 'Orders fetched.'));
});

// GET /api/admin/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findOne({
        $or: [{ orderId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
        isDeleted: { $ne: true },
    })
        .populate('userId', 'name email phone')
        .populate('deliveryBoyId', 'name phone email vehicleType vehicleNumber')
        .populate('items.productId', 'name images price')
        .lean();

    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order fetched.'));
});

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);

    const update = { status };
    if (status === 'delivered') {
        update.deliveredAt = new Date();
        update.cancelledAt = null;
    } else if (status === 'cancelled') {
        update.cancelledAt = new Date();
    } else {
        update.deliveredAt = null;
        update.cancelledAt = null;
    }

    const order = await Order.findOneAndUpdate(
        {
            $or: [{ orderId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
            isDeleted: { $ne: true },
        },
        update,
        { new: true }
    ).populate('userId', 'name email');

    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, order, 'Order status updated.'));
});

// PATCH /api/admin/orders/:id/assign-delivery
export const assignDeliveryBoy = asyncHandler(async (req, res) => {
    const { deliveryBoyId } = req.body;
    if (!deliveryBoyId) throw new ApiError(400, 'deliveryBoyId is required.');

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).select('name isActive applicationStatus');
    if (!deliveryBoy) throw new ApiError(404, 'Delivery boy not found.');
    if (!deliveryBoy.isActive) throw new ApiError(400, 'Delivery boy is inactive.');
    if (deliveryBoy.applicationStatus !== 'approved') {
        throw new ApiError(400, 'Delivery boy is not approved.');
    }

    const filter = {
        $or: [{ orderId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
        isDeleted: { $ne: true },
    };
    const order = await Order.findOne(filter);
    if (!order) throw new ApiError(404, 'Order not found.');

    if (['cancelled', 'returned', 'delivered'].includes(String(order.status))) {
        throw new ApiError(409, `Cannot assign delivery for ${order.status} order.`);
    }

    const previousDeliveryBoyId = order.deliveryBoyId ? String(order.deliveryBoyId) : '';
    const isReassigned = previousDeliveryBoyId && previousDeliveryBoyId !== String(deliveryBoyId);

    order.deliveryBoyId = deliveryBoyId;
    if (order.status === 'pending') {
        order.status = 'processing';
    }
    await order.save();

    await createNotification({
        recipientId: deliveryBoy._id,
        recipientType: 'delivery',
        title: isReassigned ? 'Order reassigned' : 'New order assigned',
        message: `${order.orderId} has been ${isReassigned ? 'reassigned to you' : 'assigned to you'}.`,
        type: 'order',
        data: {
            orderId: String(order.orderId),
            reassigned: isReassigned ? 'true' : 'false',
            assignedAt: new Date().toISOString(),
        },
    });

    res.status(200).json(new ApiResponse(200, order, 'Delivery boy assigned.'));
});

// DELETE /api/admin/orders/:id
export const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOneAndUpdate(
        {
            $or: [{ orderId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
            isDeleted: { $ne: true },
        },
        {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.user?.id || null,
        },
        { new: true }
    );
    if (!order) throw new ApiError(404, 'Order not found.');
    res.status(200).json(new ApiResponse(200, null, 'Order archived.'));
});
