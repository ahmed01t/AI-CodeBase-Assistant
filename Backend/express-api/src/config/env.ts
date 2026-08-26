import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),

  MONGODB_URI: z.string().optional(),

  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
});

export const env = envSchema.parse(process.env);