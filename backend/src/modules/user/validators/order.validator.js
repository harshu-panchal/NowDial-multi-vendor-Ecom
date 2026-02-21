import Joi from 'joi';

export const placeOrderSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().optional(),
            variant: Joi.object({ size: Joi.string(), color: Joi.string() }).optional(),
        })
    ).min(1).required(),
    shippingAddress: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required(),
    }).required(),
    paymentMethod: Joi.string().valid('card', 'cash', 'cod', 'bank', 'wallet', 'upi').required(),
    couponCode: Joi.string().optional().allow(''),
    shippingOption: Joi.string().valid('standard', 'express').default('standard'),
});
