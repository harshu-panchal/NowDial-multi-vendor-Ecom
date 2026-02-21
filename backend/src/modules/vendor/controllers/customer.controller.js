import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';

const getCustomerIdFromOrder = (order) => {
    const raw =
        order?.userId?._id ||
        order?.userId ||
        `guest-${order?.orderId ?? order?._id}`;
    return String(raw);
};

const getCustomerIdentity = (order) => ({
    name:
        order?.shippingAddress?.name ||
        order?.guestInfo?.name ||
        'Guest Customer',
    email:
        order?.shippingAddress?.email ||
        order?.guestInfo?.email ||
        '',
    phone:
        order?.shippingAddress?.phone ||
        order?.guestInfo?.phone ||
        '',
});

const getVendorItemTotal = (order, vendorId) => {
    const vendorItem = order?.vendorItems?.find(
        (vi) => String(vi?.vendorId) === String(vendorId)
    );
    return vendorItem?.subtotal || vendorItem?.vendorEarnings || 0;
};

export const getVendorCustomers = asyncHandler(async (req, res) => {
    const { search = '' } = req.query;
    const orders = await Order.find({ 'vendorItems.vendorId': req.user.id })
        .sort({ createdAt: -1 })
        .lean();

    const customerMap = {};
    for (const order of orders) {
        const customerId = getCustomerIdFromOrder(order);
        const identity = getCustomerIdentity(order);
        const orderDate = order?.createdAt ?? order?.date ?? null;
        const orderTotal = getVendorItemTotal(order, req.user.id);

        if (!customerMap[customerId]) {
            customerMap[customerId] = {
                id: customerId,
                name: identity.name,
                email: identity.email,
                phone: identity.phone,
                orders: 0,
                totalSpent: 0,
                lastOrderDate: orderDate,
            };
        }

        customerMap[customerId].orders += 1;
        customerMap[customerId].totalSpent += orderTotal;

        if (orderDate) {
            const existingDate = customerMap[customerId].lastOrderDate
                ? new Date(customerMap[customerId].lastOrderDate)
                : null;
            const currentDate = new Date(orderDate);
            if (!existingDate || currentDate > existingDate) {
                customerMap[customerId].lastOrderDate = orderDate;
            }
        }
    }

    let customers = Object.values(customerMap);
    if (search) {
        const query = String(search).toLowerCase();
        customers = customers.filter((customer) =>
            (customer.name || '').toLowerCase().includes(query) ||
            (customer.email || '').toLowerCase().includes(query) ||
            (customer.phone || '').toLowerCase().includes(query)
        );
    }

    customers.sort((a, b) => {
        const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        return bDate - aDate;
    });

    res.status(200).json(new ApiResponse(200, customers, 'Customers fetched.'));
});

export const getVendorCustomerById = asyncHandler(async (req, res) => {
    const customerId = String(req.params.id);
    const orders = await Order.find({ 'vendorItems.vendorId': req.user.id })
        .sort({ createdAt: -1 })
        .lean();

    const customerOrders = orders.filter(
        (order) => getCustomerIdFromOrder(order) === customerId
    );

    if (customerOrders.length === 0) {
        throw new ApiError(404, 'Customer not found.');
    }

    const firstOrder = customerOrders[0];
    const identity = getCustomerIdentity(firstOrder);
    const totalSpent = customerOrders.reduce(
        (sum, order) => sum + getVendorItemTotal(order, req.user.id),
        0
    );

    const detail = {
        id: customerId,
        name: identity.name,
        email: identity.email,
        phone: identity.phone,
        orders: customerOrders.length,
        totalSpent,
        lastOrderDate: firstOrder?.createdAt ?? firstOrder?.date ?? null,
        orderHistory: customerOrders,
    };

    res.status(200).json(new ApiResponse(200, detail, 'Customer details fetched.'));
});
