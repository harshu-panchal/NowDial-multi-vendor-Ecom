import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import Order from '../../../models/Order.model.js';
import Product from '../../../models/Product.model.js';
import Commission from '../../../models/Commission.model.js';

const toDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

const getVendorOrderStatus = (order, vendorId) => {
    const vendorItem = order?.vendorItems?.find(
        (vi) => String(vi?.vendorId) === String(vendorId)
    );
    return String(vendorItem?.status || order?.status || 'pending').toLowerCase();
};

const getVendorOrderRevenue = (order, vendorId) => {
    const vendorItem = order?.vendorItems?.find(
        (vi) => String(vi?.vendorId) === String(vendorId)
    );
    return Number(vendorItem?.subtotal || vendorItem?.vendorEarnings || 0);
};

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
    const [orders, productsCount, commissions] = await Promise.all([
        Order.find({ 'vendorItems.vendorId': req.user.id })
            .select('createdAt date status vendorItems')
            .sort({ createdAt: 1 })
            .lean(),
        Product.countDocuments({ vendorId: req.user.id }),
        Commission.find({ vendorId: req.user.id })
            .select('vendorEarnings status')
            .lean(),
    ]);

    const dailyMap = {};
    const statusCounts = {};
    for (const order of orders) {
        const dateKey = toDateKey(order?.createdAt || order?.date);
        if (!dateKey) continue;

        const revenue = getVendorOrderRevenue(order, req.user.id);
        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
        }
        dailyMap[dateKey].revenue += revenue;
        dailyMap[dateKey].orders += 1;

        const status = getVendorOrderStatus(order, req.user.id);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    const timeseries = Object.values(dailyMap).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );

    const totalRevenue = commissions.reduce(
        (sum, c) => sum + Number(c?.vendorEarnings || 0),
        0
    );
    const pendingEarnings = commissions
        .filter((c) => c?.status === 'pending')
        .reduce((sum, c) => sum + Number(c?.vendorEarnings || 0), 0);

    const summary = {
        totalRevenue,
        pendingEarnings,
        totalOrders: orders.length,
        totalProducts: productsCount,
    };

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
    }));

    res.status(200).json(
        new ApiResponse(
            200,
            { summary, timeseries, statusBreakdown },
            'Analytics overview fetched.'
        )
    );
});
