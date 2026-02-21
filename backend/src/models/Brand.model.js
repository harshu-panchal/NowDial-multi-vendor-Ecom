import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true },
        logo: { type: String },
        description: { type: String },
        website: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Brand = mongoose.model('Brand', brandSchema);
export { Brand };
export default Brand;
