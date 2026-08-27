import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.substring("Bearer ".length);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    (req as AuthenticatedRequest).userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
}