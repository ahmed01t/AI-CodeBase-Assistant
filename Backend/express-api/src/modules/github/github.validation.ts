import { z } from "zod";

/**
 * Validation schema for GET /api/v1/github/repos/:owner/:repo
 */
export const githubRepoParamSchema = z.object({
  owner: z
    .string()
    .trim()
    .min(1, "Repository owner is required"),
  repo: z
    .string()
    .trim()
    .min(1, "Repository name is required"),
});

