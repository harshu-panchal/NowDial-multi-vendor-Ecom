import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Product from '../../../models/Product.model.js';
import { slugify } from '../../../utils/slugify.js';

const deriveStockStatus = (stockQuantity = 0, lowStockThreshold = 10) => {
    if (stockQuantity <= 0) return 'out_of_stock';
    if (stockQuantity <= lowStockThreshold) return 'low_stock';
    return 'in_stock';
};

const sanitizeFaqs = (faqs) => {
    if (!Array.isArray(faqs)) return [];
    return faqs
        .map((faq) => ({
            question: String(faq?.question || '').trim(),
            answer: String(faq?.answer || '').trim(),
        }))
        .filter((faq) => faq.question && faq.answer);
};

const normalizeVariantPart = (value) => String(value || '').trim().toLowerCase();

const uniqueAxisValues = (values = []) => {
    const seen = new Set();
    const out = [];
    for (const raw of values) {
        const value = String(raw || '').trim();
        if (!value) continue;
        const key = normalizeVariantPart(value);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
    }
    return out;
};

const createVariantKey = (size = '', color = '') =>
    `${normalizeVariantPart(size)}|${normalizeVariantPart(color)}`;

const normalizeVariantsPayload = (rawVariants = {}, fallbackPrice) => {
    if (!rawVariants || typeof rawVariants !== 'object') {
        return { sizes: [], colors: [], prices: {}, defaultVariant: {} };
    }

    const sizes = uniqueAxisValues(rawVariants.sizes || []);
    const colors = uniqueAxisValues(rawVariants.colors || []);
    const hasSizeAxis = sizes.length > 0;
    const hasColorAxis = colors.length > 0;
    const hasAnyAxis = hasSizeAxis || hasColorAxis;

    if (!hasAnyAxis) {
        return { sizes: [], colors: [], prices: {}, defaultVariant: {} };
    }

    const combinations = [];
    if (hasSizeAxis && hasColorAxis) {
        sizes.forEach((size) => colors.forEach((color) => combinations.push({ size, color })));
    } else if (hasSizeAxis) {
        sizes.forEach((size) => combinations.push({ size, color: '' }));
    } else {
        colors.forEach((color) => combinations.push({ size: '', color }));
    }

    const pricesSource =
        rawVariants.prices instanceof Map
            ? Object.fromEntries(rawVariants.prices)
            : (typeof rawVariants.prices === 'object' && rawVariants.prices !== null ? rawVariants.prices : {});
    const prices = {};

    combinations.forEach(({ size, color }) => {
        const key = createVariantKey(size, color);
        const rawPrice = pricesSource[key];
        const parsedPrice = Number(rawPrice);
        if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
            prices[key] = parsedPrice;
            return;
        }

        const fallback = Number(fallbackPrice);
        if (Number.isFinite(fallback) && fallback >= 0) {
            prices[key] = fallback;
        }
    });

    const defaultSize = String(rawVariants?.defaultVariant?.size || '').trim();
    const defaultColor = String(rawVariants?.defaultVariant?.color || '').trim();
    const normalizedDefaultSize = hasSizeAxis ? defaultSize : '';
    const normalizedDefaultColor = hasColorAxis ? defaultColor : '';
    const hasValidDefaultSize = !normalizedDefaultSize || sizes.some((s) => normalizeVariantPart(s) === normalizeVariantPart(normalizedDefaultSize));
    const hasValidDefaultColor = !normalizedDefaultColor || colors.some((c) => normalizeVariantPart(c) === normalizeVariantPart(normalizedDefaultColor));

    if (!hasValidDefaultSize || !hasValidDefaultColor) {
        throw new ApiError(400, 'Default variant must exist in provided sizes/colors.');
    }

    return {
        sizes,
        colors,
        prices,
        defaultVariant: {
            size: normalizedDefaultSize,
            color: normalizedDefaultColor,
        },
    };
};

// GET /api/vendor/products
export const getVendorProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, stock } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const skip = (numericPage - 1) * numericLimit;
    const filter = { vendorId: req.user.id };
    if (search) filter.$text = { $search: search };
    if (stock) filter.stock = stock;

    const products = await Product.find(filter).populate('categoryId', 'name').populate('brandId', 'name').sort({ createdAt: -1 }).skip(skip).limit(numericLimit);
    const total = await Product.countDocuments(filter);
    res.status(200).json(new ApiResponse(200, { products, total, page: numericPage, pages: Math.ceil(total / numericLimit) }, 'Products fetched.'));
});

// GET /api/vendor/products/:id
export const getVendorProductById = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, vendorId: req.user.id })
        .populate('categoryId', 'name parentId')
        .populate('brandId', 'name');
    if (!product) throw new ApiError(404, 'Product not found or access denied.');
    res.status(200).json(new ApiResponse(200, product, 'Product fetched.'));
});

// POST /api/vendor/products
export const createProduct = asyncHandler(async (req, res) => {
    const { name, ...rest } = req.body;
    if (!name) throw new ApiError(400, 'Product name is required.');
    const slug = slugify(name) + '-' + Date.now();
    const stockQuantity = Number(rest.stockQuantity ?? 0);
    const lowStockThreshold = Number(rest.lowStockThreshold ?? 10);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
        throw new ApiError(400, 'Invalid stock quantity.');
    }
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
        throw new ApiError(400, 'Invalid low stock threshold.');
    }
    const stock = deriveStockStatus(stockQuantity, lowStockThreshold);

    const price = Number(rest.price);
    if (!Number.isFinite(price) || price < 0) {
        throw new ApiError(400, 'Invalid product price.');
    }
    const normalizedVariants = normalizeVariantsPayload(rest.variants, price);

    const product = await Product.create({
        name,
        slug,
        vendorId: req.user.id,
        ...rest,
        price,
        variants: normalizedVariants,
        faqs: sanitizeFaqs(rest.faqs),
        stockQuantity,
        lowStockThreshold,
        stock,
    });
    res.status(201).json(new ApiResponse(201, product, 'Product created.'));
});

// PUT /api/vendor/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, vendorId: req.user.id });
    if (!product) throw new ApiError(404, 'Product not found or access denied.');
    Object.assign(product, req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, 'faqs')) {
        product.faqs = sanitizeFaqs(req.body.faqs);
    }
    if (typeof req.body.stockQuantity !== 'undefined' || typeof req.body.lowStockThreshold !== 'undefined') {
        const stockQuantity = Number(product.stockQuantity ?? 0);
        const lowStockThreshold = Number(product.lowStockThreshold ?? 10);
        if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
            throw new ApiError(400, 'Invalid stock quantity.');
        }
        if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
            throw new ApiError(400, 'Invalid low stock threshold.');
        }
        product.stockQuantity = stockQuantity;
        product.lowStockThreshold = lowStockThreshold;
        product.stock = deriveStockStatus(stockQuantity, lowStockThreshold);
    }
    if (typeof req.body.price !== 'undefined') {
        const price = Number(req.body.price);
        if (!Number.isFinite(price) || price < 0) {
            throw new ApiError(400, 'Invalid product price.');
        }
        product.price = price;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'variants')) {
        product.variants = normalizeVariantsPayload(req.body.variants, product.price);
    }
    await product.save();
    res.status(200).json(new ApiResponse(200, product, 'Product updated.'));
});

// DELETE /api/vendor/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findOneAndDelete({ _id: req.params.id, vendorId: req.user.id });
    if (!product) throw new ApiError(404, 'Product not found or access denied.');
    res.status(200).json(new ApiResponse(200, null, 'Product deleted.'));
});

// PATCH /api/vendor/stock/:productId
export const updateStock = asyncHandler(async (req, res) => {
    const { stockQuantity } = req.body;
    const product = await Product.findOne({ _id: req.params.productId, vendorId: req.user.id });
    if (!product) throw new ApiError(404, 'Product not found.');

    const numericStockQuantity = Number(stockQuantity);
    if (!Number.isFinite(numericStockQuantity) || numericStockQuantity < 0) {
        throw new ApiError(400, 'Invalid stock quantity.');
    }

    product.stockQuantity = numericStockQuantity;
    product.stock = deriveStockStatus(numericStockQuantity, product.lowStockThreshold);
    await product.save();

    res.status(200).json(new ApiResponse(200, product, 'Stock updated.'));
});
