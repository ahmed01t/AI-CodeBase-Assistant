import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISH_KEY
);

/**
 * Creates a Supabase client scoped with the user's JWT access token.
 * This ensures that PostgreSQL Row Level Security (RLS) policies
 * and auth.uid() function evaluate correctly for the logged-in user.
 */
export function getAuthenticatedSupabaseClient(token: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISH_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}


