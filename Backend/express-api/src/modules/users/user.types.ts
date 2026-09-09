/**
 * User Profile Data Model representing a row in public.profiles
 */
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for updating the authenticated user's profile
 */
export interface UpdateUserProfileInput {
  display_name?: string;
  avatar_url?: string | null;
}

