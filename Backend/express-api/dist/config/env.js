import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    PORT: z.coerce.number().default(5000),
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISH_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    MONGODB_URI: z.string().optional(),
    DB_NAME: z.string().optional(),
    MONGODB_DB_NAME: z.string().default("codebase-assistant"),
    AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
    // GitHub Integration Configuration
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_API_URL: z.string().url().default("https://api.github.com"),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    // Local Ollama AI Engine Configuration
    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_EMBEDDING_MODEL: z.string().default("qwen3-embedding:0.6b"),
    OLLAMA_CHAT_MODEL: z.string().default("qwen3:1.7b"),
});
export const env = envSchema.parse(process.env);
