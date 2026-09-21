import { z } from "zod";

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, "Search query text cannot be empty"),
  projectId: z.string().uuid("Invalid project ID format (UUID expected)"),
  repositoryId: z.string().uuid("Invalid repository ID format (UUID expected)").optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.5),
});

export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;

