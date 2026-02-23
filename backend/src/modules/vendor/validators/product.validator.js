import Joi from 'joi';

export const createProductSchema = Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().optional(),
    price: Joi.number().min(0).required(),
    originalPrice: Joi.number().min(0).optional(),
    unit: Joi.string().default('Piece'),
    categoryId: Joi.string().required(),
    brandId: Joi.string().optional(),
    stockQuantity: Joi.number().integer().min(0).default(0),
    lowStockThreshold: Joi.number().integer().min(0).default(10),
    taxRate: Joi.number().min(0).max(100).default(18),
    flashSale: Joi.boolean().default(false),
    isNewArrival: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string()).optional(),
    faqs: Joi.array().items(
        Joi.object({
            question: Joi.string().trim().allow('').optional(),
            answer: Joi.string().trim().allow('').optional(),
        })
    ).optional(),
    variants: Joi.object({
        sizes: Joi.array().items(Joi.string()),
        colors: Joi.array().items(Joi.string()),
    }).optional(),
});
