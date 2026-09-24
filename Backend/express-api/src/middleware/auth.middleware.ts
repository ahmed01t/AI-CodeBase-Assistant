import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export interface AuthenticatedRequest extends Request {
  userId: string;
  token: string;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required");
    }

    const token = authHeader.substring("Bearer ".length);

    const { data: { user }, error,} = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(401, "Invalid or expired authentication token");
    }

    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).token = token;

    next();
  } catch (error) {
    next(error);
  }
}