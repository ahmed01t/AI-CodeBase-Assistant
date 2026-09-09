import { z } from "zod";
/**
 * Validation schema for POST /api/v1/projects (Create Project)
 */
export const createProjectSchema = z.object({
    organization_id: z
        .string()
        .uuid("Invalid organization ID format. Must be a valid UUID"),
    name: z
        .string()
        .trim()
        .min(1, "Project name is required")
        .max(100, "Project name must be 100 characters or less"),
    slug: z
        .string()
        .trim()
        .min(1, "Slug cannot be empty")
        .max(100, "Slug must be 100 characters or less")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional(),
    description: z
        .string()
        .trim()
        .max(500, "Description must be 500 characters or less")
        .optional(),
});
/**
 * Validation schema for PATCH /api/v1/projects/:id (Update Project)
 */
export const updateProjectSchema = z
    .object({
    name: z
        .string()
        .trim()
        .min(1, "Project name cannot be empty")
        .max(100, "Project name must be 100 characters or less")
        .optional(),
    slug: z
        .string()
        .trim()
        .min(1, "Slug cannot be empty")
        .max(100, "Slug must be 100 characters or less")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional(),
    description: z
        .string()
        .trim()
        .max(500, "Description must be 500 characters or less")
        .optional(),
})
    .refine((data) => data.name !== undefined || data.slug !== undefined || data.description !== undefined, { message: "At least one field (name, slug, or description) must be provided for update" });
/**
 * Validation schema for route parameters containing a Project UUID
 */
export const projectParamSchema = z.object({
    id: z.string().uuid("Invalid project ID format. Must be a valid UUID"),
});
/**
 * Validation schema for GET /api/v1/projects query parameters
 */
export const listProjectsQuerySchema = z.object({
    organization_id: z.string().uuid("Invalid organization ID format").optional(),
});
