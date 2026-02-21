import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import Order from '../../../models/Order.model.js';
import Product from '../../../models/Product.model.js';

// GET /api/admin/reports/sales
export const getSalesReport = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        status = 'delivered',
        startDate,
        endDate,
        search
    } = req.query;

    const numericPage = Number.parseInt(page, 10) || 1;
    const numericLimit = Number.parseInt(limit, 10) || 20;
    const skip = (numericPage - 1) * numericLimit;

    const filter = { isDeleted: { $ne: true } };
    if (status && status !== 'all') filter.status = status;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [
            { orderId: regex },
            { 'shippingAddress.name': regex },
            { 'shippingAddress.email': regex },
        ];
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Order.countDocuments(filter),
    ]);

    const summary = orders.reduce(
        (acc, order) => {
            const totalAmount = Number(order.total) || 0;
            acc.totalSales += totalAmount;
            acc.totalOrders += 1;
            return acc;
        },
        { totalSales: 0, totalOrders: 0 }
    );
    summary.averageOrderValue =
        summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0;

    res.status(200).json(
        new ApiResponse(
            200,
            {
                orders,
                total,
                page: numericPage,
                pages: Math.ceil(total / numericLimit),
                summary,
            },
            'Sales report fetched.'
        )
    );
});

// GET /api/admin/reports/inventory
export const getInventoryReport = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, status } = req.query;
    const numericPage = Number.parseInt(page, 10) || 1;
    const numericLimit = Number.parseInt(limit, 10) || 50;
    const skip = (numericPage - 1) * numericLimit;

    const filter = {};
    if (search) filter.$text = { $search: search };
    if (status && status !== 'all') filter.stock = status;

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('categoryId', 'name')
            .populate('brandId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Product.countDocuments(filter),
    ]);

    const allMatchedProducts = await Product.find(filter).select('stock stockQuantity price isActive').lean();
    const summary = {
        totalProducts: allMatchedProducts.length,
        activeProducts: allMatchedProducts.filter((p) => p.isActive !== false).length,
        lowStock: allMatchedProducts.filter((p) => p.stock === 'low_stock').length,
        outOfStock: allMatchedProducts.filter((p) => p.stock === 'out_of_stock').length,
        totalValue: allMatchedProducts.reduce(
            (sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stockQuantity) || 0)),
            0
        ),
    };

    res.status(200).json(
        new ApiResponse(
            200,
            {
                products,
                total,
                page: numericPage,
                pages: Math.ceil(total / numericLimit),
                summary,
            },
            'Inventory report fetched.'
        )
    );
});
