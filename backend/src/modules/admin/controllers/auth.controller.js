import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Admin from '../../../models/Admin.model.js';
import { generateTokens } from '../../../utils/generateToken.js';

// POST /api/admin/auth/login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) throw new ApiError(401, 'Invalid credentials.');
    if (!admin.isActive) throw new ApiError(403, 'Admin account is deactivated.');

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) throw new ApiError(401, 'Invalid credentials.');

    const { accessToken, refreshToken } = generateTokens({ id: admin._id, role: 'admin', email: admin.email });
    res.status(200).json(new ApiResponse(200, { accessToken, refreshToken, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } }, 'Admin login successful.'));
});

// GET /api/admin/auth/profile
export const getProfile = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.user.id);
    if (!admin) throw new ApiError(404, 'Admin not found.');
    res.status(200).json(new ApiResponse(200, admin, 'Profile fetched.'));
});
