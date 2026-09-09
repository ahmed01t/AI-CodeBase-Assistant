import { z } from "zod";

/**
 * Validation schema for PATCH /api/v1/users/me (Update Profile)
 */
export const updateProfileSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty")
      .max(100, "Display name cannot exceed 100 characters")
      .optional(),
    avatar_url: z
      .string()
      .trim()
      .url("Invalid avatar URL format")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => data.display_name !== undefined || data.avatar_url !== undefined,
    { message: "At least one field (display_name or avatar_url) must be provided to update" }
  );

