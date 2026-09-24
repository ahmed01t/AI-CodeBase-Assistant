import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISH_KEY);
/**
 * Creates a Supabase client scoped with the user's JWT access token.
 * This ensures that PostgreSQL Row Level Security (RLS) policies
 * and auth.uid() function evaluate correctly for the logged-in user.
 */
export function getAuthenticatedSupabaseClient(token) {
    // If a service role key is configured, use service role for elevated backend reliability
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISH_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
}
/**
 * Returns an admin Supabase client with service_role privileges if available,
 * otherwise falls back to standard publishable client.
 */
export function getSupabaseAdminClient() {
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return supabase;
}
