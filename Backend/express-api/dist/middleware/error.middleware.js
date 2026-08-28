import { ApiError } from "../utils/ApiError.js";
/**
 * Global Error Handling Middleware
 * Catches all ApiErrors and unexpected runtime exceptions, returning a consistent JSON error payload.
 */
export function errorHandler(err, _req, res, _next) {
    let error = err;
    // Wrap unexpected non-ApiErrors into an ApiError instance
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, [], err.stack);
    }
    return res.status(error.statusCode).json({
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors.length > 0 ? error.errors : undefined,
    });
}
