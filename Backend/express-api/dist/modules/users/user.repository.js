import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
/**
 * User Repository
 * Handles all database operations for the public.profiles table using Supabase.
 * Respects Row Level Security (RLS) policies (id = auth.uid()).
 */
export class UserRepository {
    /**
     * Fetches a user profile by ID.
     * RLS policy (authenticated_users_can_read_profiles) allows authenticated reading.
     */
    async findProfileById(token, userId) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: profile, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        return profile;
    }
    /**
     * Creates an initial profile record for a user if one does not exist.
     * RLS policy (users_can_create_own_profile) ensures id = auth.uid().
     */
    async createInitialProfile(token, userId) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: newProfile, error } = await client
            .from("profiles")
            .insert({
            id: userId,
            display_name: null,
            avatar_url: null,
        })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return newProfile;
    }
    /**
     * Updates an existing user profile record.
     * RLS policy (users_can_update_own_profile) ensures id = auth.uid().
     */
    async updateProfile(token, userId, input) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: updatedProfile, error } = await client
            .from("profiles")
            .update({
            ...(input.display_name !== undefined && { display_name: input.display_name }),
            ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url }),
            updated_at: new Date().toISOString(),
        })
            .eq("id", userId)
            .select()
            .maybeSingle();
        if (error) {
            throw error;
        }
        return updatedProfile;
    }
}
export const userRepository = new UserRepository();
