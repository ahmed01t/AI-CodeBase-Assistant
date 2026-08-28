/**
 * Standardized ApiError class for throwing custom HTTP errors across the application.
 * Example: throw new ApiError(404, "Organization not found");
 */
export class ApiError extends Error {
    statusCode;
    success;
    errors;
    constructor(statusCode, message = "Internal Server Error", errors = [], stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
