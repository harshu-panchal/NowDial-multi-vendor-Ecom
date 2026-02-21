import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const vendorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        password: { type: String, required: true, select: false },
        phone: { type: String },
        storeName: { type: String, required: true },
        storeLogo: { type: String },
        storeDescription: { type: String },
        status: {
            type: String,
            enum: ['pending', 'approved', 'suspended', 'rejected'],
            default: 'pending',
            index: true,
        },
        suspensionReason: { type: String },
        commissionRate: { type: Number, default: 10, min: 0, max: 100 },
        isVerified: { type: Boolean, default: false },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
        },
        bankDetails: {
            accountName: { type: String, select: false },
            accountNumber: { type: String, select: false },
            bankName: { type: String, select: false },
            ifscCode: { type: String, select: false },
        },
        documents: {
            gst: String,
            pan: String,
            aadhar: String,
            businessLicense: String,
        },
        otp: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        resetOtp: { type: String, select: false },
        resetOtpExpiry: { type: Date, select: false },
        resetOtpVerified: { type: Boolean, default: false, select: false },
        refreshTokenHash: { type: String, select: false },
        refreshTokenExpiresAt: { type: Date, select: false },
        joinDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

vendorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

vendorSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Vendor = mongoose.model('Vendor', vendorSchema);
export { Vendor };
export default Vendor;
