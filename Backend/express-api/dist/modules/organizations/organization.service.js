import { organizationRepository } from "./organization.repository.js";
import { userRepository } from "../users/user.repository.js";
import { ApiError } from "../../utils/ApiError.js";
/**
 * Organization Service
 * Contains business logic for organization operations.
 * Delegates database queries to the repository layer.
 */
export class OrganizationService {
    repository;
    constructor(repository = organizationRepository) {
        this.repository = repository;
    }
    /**
     * Helper function to generate a URL-friendly slug from an organization name
     * Example: "Acme Software Corp" -> "acme-software-corp"
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
            .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphen
            .replace(/^-+|-+$/g, ""); // Trim leading and trailing hyphens
    }
    /**
     * Creates a new organization.
     * Business Logic: Auto-generates a slug if not provided, ensures caller's profile exists,
     * and handles duplicate slug errors.
     */
    async createOrganization(token, input, userId) {
        const slug = input.slug || this.generateSlug(input.name);
        // If userId is provided, ensure caller's profile exists in public.profiles first.
        // This allows the database trigger `create_organization_owner()` to insert into
        // `organization_members` without violating the foreign key constraint to public.profiles.
        if (userId) {
            try {
                const profile = await userRepository.findProfileById(token, userId);
                if (!profile) {
                    await userRepository.createInitialProfile(token, userId);
                }
            }
            catch {
                // Continue if profile creation was already handled by trigger
            }
        }
        try {
            return await this.repository.create(token, {
                name: input.name,
                slug,
            });
        }
        catch (error) {
            if (error?.code === "23505") {
                throw new ApiError(409, `Organization with slug '${slug}' already exists`);
            }
            if (error?.code === "42501") {
                throw new ApiError(403, `Forbidden: ${error.message || "Row-level security policy prevented operation"}${error.details ? ` (${error.details})` : ""}`);
            }
            throw error;
        }
    }
    /**
     * Lists all organizations accessible to the current user.
     */
    async listOrganizations(token) {
        return await this.repository.findAll(token);
    }
    /**
     * Retrieves a single organization by ID.
     * Business Logic: Throws 404 ApiError if organization is not found or not accessible.
     */
    async getOrganizationById(token, id) {
        const organization = await this.repository.findById(token, id);
        if (!organization) {
            throw new ApiError(404, "Organization not found or access denied");
        }
        return organization;
    }
    /**
     * Updates an existing organization.
     * Business Logic: Validates organization existence and updates fields.
     */
    async updateOrganization(token, id, input) {
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new ApiError(404, "Organization not found or access denied");
        }
        try {
            const updated = await this.repository.update(token, id, input);
            if (!updated) {
                throw new ApiError(403, "Forbidden: Only organization admins can update organization details");
            }
            return updated;
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            if (error?.code === "23505") {
                throw new ApiError(409, `Organization with slug '${input.slug}' already exists`);
            }
            throw error;
        }
    }
    /**
     * Deletes an organization.
     * Business Logic: Ensures organization exists and user has owner rights.
     */
    async deleteOrganization(token, id) {
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new ApiError(404, "Organization not found or access denied");
        }
        const deleted = await this.repository.delete(token, id);
        if (!deleted) {
            throw new ApiError(403, "Forbidden: Only the organization owner can delete an organization");
        }
        return deleted;
    }
}
export const organizationService = new OrganizationService();
