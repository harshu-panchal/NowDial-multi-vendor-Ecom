import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import { uploadLocalFileToCloudinaryAndCleanup } from '../../../services/upload.service.js';

// POST /api/vendor/uploads/image
export const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file?.path) {
        throw new ApiError(400, 'Image file is required');
    }

    const folder = (req.body?.folder || 'vendors/products').toString().trim() || 'vendors/products';
    const publicId = req.body?.publicId ? String(req.body.publicId).trim() : undefined;

    const uploaded = await uploadLocalFileToCloudinaryAndCleanup(req.file.path, folder, publicId);
    return res
        .status(201)
        .json(new ApiResponse(201, uploaded, 'Image uploaded successfully'));
});

// POST /api/vendor/uploads/images
export const uploadImages = asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
        throw new ApiError(400, 'At least one image file is required');
    }

    const folder = (req.body?.folder || 'vendors/products').toString().trim() || 'vendors/products';
    const uploads = await Promise.all(
        files.map((file) =>
            uploadLocalFileToCloudinaryAndCleanup(file.path, folder)
        )
    );

    return res
        .status(201)
        .json(new ApiResponse(201, uploads, 'Images uploaded successfully'));
});
