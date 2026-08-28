import { supabase } from "../lib/supabase.js";
import { ApiError } from "../utils/ApiError.js";
export async function requireAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            throw new ApiError(401, "Authentication required");
        }
        const token = authHeader.substring("Bearer ".length);
        const { data: { user }, error, } = await supabase.auth.getUser(token);
        if (error || !user) {
            throw new ApiError(401, "Invalid or expired authentication token");
        }
        req.userId = user.id;
        req.token = token;
        next();
    }
    catch (error) {
        next(error);
    }
}
