import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
/**
 * Middleware factory to validate incoming HTTP request body, params, or query
 * against provided Zod schemas. Throws ApiError(400) if validation fails.
 */
export function validateRequest(schemas) {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.params) {
                req.params = (await schemas.params.parseAsync(req.params));
            }
            if (schemas.query) {
                req.query = (await schemas.query.parseAsync(req.query));
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const validationErrors = error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));
                return next(new ApiError(400, "Validation failed", validationErrors));
            }
            next(error);
        }
    };
}
