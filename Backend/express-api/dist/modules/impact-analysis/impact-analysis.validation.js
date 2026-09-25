import { z } from "zod";
export const impactAnalysisSchema = z.object({
    repositoryId: z.string().uuid(),
    target: z.string().trim().min(2).max(200),
});
