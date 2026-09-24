import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    PORT: z.coerce.number().default(5000),
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISH_KEY: z.string().min(1),
    MONGODB_URI: z.string().optional(),
    DB_NAME: z.string().optional(),
    MONGODB_DB_NAME: z.string().default("codebase-assistant"),
    AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
    // GitHub Integration Configuration
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_API_URL: z.string().url().default("https://api.github.com"),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    // Google Gemini Configuration
    GEMINI_API_KEY: z.string().optional(),
});
export const env = envSchema.parse(process.env);
