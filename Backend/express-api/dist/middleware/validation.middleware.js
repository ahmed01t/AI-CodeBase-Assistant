import { ZodError } from "zod";
/**
 * Middleware factory to validate incoming HTTP request body, params, or query
 * against provided Zod schemas. Returns 400 Bad Request if validation fails.
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
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                });
            }
            next(error);
        }
    };
}
