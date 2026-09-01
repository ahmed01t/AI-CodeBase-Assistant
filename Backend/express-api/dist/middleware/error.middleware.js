import { ApiError } from "../utils/ApiError.js";
/**
 * Global Error Handling Middleware
 * Catches all ApiErrors, Supabase/PostgreSQL database errors, and runtime exceptions.
 * Formats and returns exact error messages, details, hints, and error codes for developers.
 */
export function errorHandler(err, _req, res, _next) {
    let error = err;
    // Wrap unexpected non-ApiErrors (e.g. Supabase PostgREST / Postgres errors) into an ApiError
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || error.status || 500;
        let message = error.message || "Internal Server Error";
        if (error.details) {
            message += ` (Details: ${error.details})`;
        }
        if (error.hint) {
            message += ` (Hint: ${error.hint})`;
        }
        const extraErrors = [];
        if (error.code)
            extraErrors.push({ code: error.code });
        if (error.details)
            extraErrors.push({ details: error.details });
        if (error.hint)
            extraErrors.push({ hint: error.hint });
        error = new ApiError(statusCode, message, extraErrors, err.stack);
    }
    return res.status(error.statusCode).json({
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        ...(error.errors && error.errors.length > 0 ? { errors: error.errors } : {}),
    });
}
