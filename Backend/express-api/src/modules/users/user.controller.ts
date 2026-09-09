import type { Request, Response, NextFunction } from "express";
import { userService } from "./user.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import type { UpdateUserProfileInput } from "./user.types.js";

/**
 * User Controller
 * Handles HTTP concerns for current user profile endpoints (/api/v1/users/me).
 * Extracts authenticated identity from req context and delegates to UserService.
 */

/**
 * Handles GET /api/v1/users/me (Get Current User Profile)
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;

    const profile = await userService.getCurrentUserProfile(token, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, profile, "User profile retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Handles PATCH /api/v1/users/me (Update Current User Profile)
 */
export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;
    const input: UpdateUserProfileInput = req.body;

    const updatedProfile = await userService.updateCurrentUserProfile(
      token,
      userId,
      input
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedProfile, "User profile updated successfully"));
  } catch (error) {
    next(error);
  }
}

