import mongoose from 'mongoose';

const vendorPromotionSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['discount', 'flash_sale', 'promo_code'],
            default: 'discount',
        },
        code: { type: String, trim: true, uppercase: true },
        description: { type: String, default: '' },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        discountValue: { type: Number, required: true, min: 0 },
        minPurchase: { type: Number, default: 0, min: 0 },
        maxDiscount: { type: Number, default: 0, min: 0 },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        usageLimit: { type: Number, default: 0, min: 0 },
        usageCount: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ['active', 'inactive', 'expired'],
            default: 'active',
        },
        productIds: [{ type: mongoose.Schema.Types.Mixed }],
    },
    { timestamps: true }
);

vendorPromotionSchema.index({ vendorId: 1, createdAt: -1 });

const VendorPromotion = mongoose.model('VendorPromotion', vendorPromotionSchema);
export { VendorPromotion };
export default VendorPromotion;
