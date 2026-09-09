import { userRepository } from "./user.repository.js";
import { ApiError } from "../../utils/ApiError.js";
/**
 * User Service
 * Manages application profile data for the currently authenticated user.
 * Ensures initial profile creation and enforces authorization rules.
 */
export class UserService {
    repository;
    constructor(repository = userRepository) {
        this.repository = repository;
    }
    /**
     * Retrieves the current authenticated user's profile.
     * If a profile record does not exist in public.profiles yet, automatically creates an initial profile.
     */
    async getCurrentUserProfile(token, userId) {
        let profile = await this.repository.findProfileById(token, userId);
        // If profile row doesn't exist yet for this auth user, initialize it
        if (!profile) {
            try {
                profile = await this.repository.createInitialProfile(token, userId);
            }
            catch (error) {
                throw new ApiError(404, "User profile not found");
            }
        }
        return profile;
    }
    /**
     * Updates the current authenticated user's profile.
     */
    async updateCurrentUserProfile(token, userId, input) {
        // Ensure profile exists first
        await this.getCurrentUserProfile(token, userId);
        try {
            const updated = await this.repository.updateProfile(token, userId, input);
            if (!updated) {
                throw new ApiError(404, "User profile not found or update failed");
            }
            return updated;
        }
        catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            if (error?.code === "42501") {
                throw new ApiError(403, "Forbidden: You can only update your own profile");
            }
            throw error;
        }
    }
}
export const userService = new UserService();
