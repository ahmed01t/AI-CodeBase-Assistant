import { z } from "zod";

/**
 * Validation schema for POST /api/v1/repositories (Create Repository Record)
 */
export const createRepositorySchema = z.object({
  project_id: z
    .string()
    .uuid("Invalid project ID format. Must be a valid UUID"),
  provider: z
    .enum(["github", "gitlab", "bitbucket"])
    .default("github"),
  external_id: z
    .string()
    .trim()
    .min(1, "External ID is required"),
  owner: z
    .string()
    .trim()
    .min(1, "Owner is required"),
  name: z
    .string()
    .trim()
    .min(1, "Repository name is required"),
  full_name: z
    .string()
    .trim()
    .optional(),
  default_branch: z
    .string()
    .trim()
    .default("main"),
  url: z
    .string()
    .trim()
    .url("Invalid URL format"),
  is_active: z
    .boolean()
    .default(true)
    .optional(),
});

/**
 * Validation schema for route parameters containing a Repository UUID or Project UUID
 */
export const repositoryParamSchema = z.object({
  id: z.string().uuid("Invalid repository ID format. Must be a valid UUID").optional(),
  projectId: z.string().uuid("Invalid project ID format. Must be a valid UUID").optional(),
});

/**
 * Validation schema for GET /api/v1/repositories query string parameters
 */
export const listRepositoriesQuerySchema = z.object({
  project_id: z.string().uuid("Invalid project ID format. Must be a valid UUID").optional(),
});

