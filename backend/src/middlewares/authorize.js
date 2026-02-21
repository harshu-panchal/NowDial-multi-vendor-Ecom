import ApiError from '../utils/ApiError.js';

/**
 * Role-based authorization middleware
 * Usage: authorize('admin'), authorize('vendor'), authorize('customer', 'admin')
 */
export const authorize = (...roles) =>
    (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required.'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}`));
        }
        next();
    };
