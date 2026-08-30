import { z } from "zod";
/**
 * Validation schema for POST /api/v1/organizations/:organizationId/members (Add Member)
 */
export const addMemberSchema = z.object({
    user_id: z
        .string()
        .uuid("Invalid user ID format. Must be a valid UUID"),
    role: z.enum(["owner", "admin", "member", "viewer"]),
});
/**
 * Validation schema for PATCH /api/v1/organizations/:organizationId/members/:userId (Update Role)
 */
export const updateMemberRoleSchema = z.object({
    role: z.enum(["owner", "admin", "member", "viewer"]),
});
/**
 * Validation schema for route params containing organizationId and optional userId
 */
export const organizationMemberParamSchema = z.object({
    organizationId: z.string().uuid("Invalid organization ID format. Must be a valid UUID"),
    userId: z.string().uuid("Invalid user ID format. Must be a valid UUID").optional(),
});
