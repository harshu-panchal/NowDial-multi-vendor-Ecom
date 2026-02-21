import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import Product from '../../../models/Product.model.js';
import Order from '../../../models/Order.model.js';

const getItemProductId = (item) => {
    const raw = item?.productId ?? item?._id ?? item?.id ?? null;
    return raw ? String(raw) : null;
};

export const getInventoryReport = asyncHandler(async (req, res) => {
    const { lowStockOnly } = req.query;

    const products = await Product.find({ vendorId: req.user.id })
        .select('name price stockQuantity lowStockThreshold')
        .lean();

    const reportMap = {};
    for (const product of products) {
        const id = String(product._id);
        const stockQuantity = Number(product.stockQuantity || 0);
        const price = Number(product.price || 0);
        const lowStockThreshold = Number(product.lowStockThreshold || 10);
        reportMap[id] = {
            id,
            name: product.name,
            currentStock: stockQuantity,
            price,
            stockValue: stockQuantity * price,
            sold: 0,
            lowStockThreshold,
        };
    }

    const orders = await Order.find({ 'vendorItems.vendorId': req.user.id })
        .select('vendorItems')
        .lean();

    for (const order of orders) {
        for (const vendorItem of order.vendorItems || []) {
            if (String(vendorItem?.vendorId) !== String(req.user.id)) continue;
            for (const item of vendorItem.items || []) {
                const productId = getItemProductId(item);
                if (!productId || !reportMap[productId]) continue;
                reportMap[productId].sold += Number(item?.quantity || 1);
            }
        }
    }

    let rows = Object.values(reportMap);
    if (String(lowStockOnly).toLowerCase() === 'true') {
        rows = rows.filter(
            (row) => row.currentStock <= Number(row.lowStockThreshold || 10)
        );
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const summary = {
        totalProducts: rows.length,
        totalStockValue: rows.reduce((sum, row) => sum + row.stockValue, 0),
        totalUnitsSold: rows.reduce((sum, row) => sum + row.sold, 0),
        lowStockItems: rows.filter(
            (row) => row.currentStock <= Number(row.lowStockThreshold || 10)
        ).length,
    };

    res.status(200).json(
        new ApiResponse(
            200,
            { rows, summary },
            'Inventory report fetched.'
        )
    );
});
