import Review from '../../../models/Review.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

/**
 * @desc    Get all reviews with filtering and pagination
 * @route   GET /api/admin/reviews
 * @access  Private (Admin)
 */
export const getAllReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status } = req.query;

    const filter = {};

    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;

    const reviews = await Review.find(filter)
        .populate('userId', 'name email')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    // Normalize for frontend
    const normalizedReviews = reviews.map(review => ({
        ...review._doc,
        id: review._id,
        customerName: review.userId ? review.userId.name : 'Unknown',
        customerEmail: review.userId ? review.userId.email : 'N/A',
        productName: review.productId ? review.productId.name : 'Unknown Product',
        status: review.isApproved ? 'approved' : 'pending'
    }));

    res.status(200).json(
        new ApiResponse(200, {
            reviews: normalizedReviews,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }, 'Reviews fetched successfully')
    );
});

/**
 * @desc    Update review status (approve/reject)
 * @route   PATCH /api/admin/reviews/:id/status
 * @access  Private (Admin)
 */
export const updateReviewStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
        throw new ApiError(404, 'Review not found');
    }

    if (status === 'approved') {
        review.isApproved = true;
    } else if (status === 'rejected' || status === 'pending') {
        review.isApproved = false;
    }

    await review.save();

    res.status(200).json(
        new ApiResponse(200, review, 'Review status updated successfully')
    );
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private (Admin)
 */
export const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
        throw new ApiError(404, 'Review not found');
    }

    res.status(200).json(
        new ApiResponse(200, {}, 'Review deleted successfully')
    );
});
