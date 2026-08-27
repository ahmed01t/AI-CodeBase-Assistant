import { z } from "zod";
/**
 * Validation schema for POST /api/v1/organizations (Create)
 */
export const createOrganizationSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Organization name is required")
        .max(100, "Organization name must be 100 characters or less"),
    slug: z
        .string()
        .trim()
        .min(1, "Slug cannot be empty")
        .max(100, "Slug must be 100 characters or less")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional(),
});
/**
 * Validation schema for PATCH /api/v1/organizations/:id (Update)
 */
export const updateOrganizationSchema = z
    .object({
    name: z
        .string()
        .trim()
        .min(1, "Organization name cannot be empty")
        .max(100, "Organization name must be 100 characters or less")
        .optional(),
    slug: z
        .string()
        .trim()
        .min(1, "Slug cannot be empty")
        .max(100, "Slug must be 100 characters or less")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional(),
})
    .refine((data) => data.name !== undefined || data.slug !== undefined, { message: "At least one field (name or slug) must be provided for update" });
/**
 * Validation schema for route parameters containing an Organization UUID
 */
export const organizationParamSchema = z.object({
    id: z.string().uuid("Invalid organization ID format. Must be a valid UUID"),
});
