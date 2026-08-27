import { organizationRepository } from "./organization.repository.js";
/**
 * Custom application error class to pass HTTP status code and message
 */
export class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
/**
 * Organization Service
 * Contains business logic for organization operations.
 * Delegated database queries to the repository layer.
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
     * Business Logic: Auto-generates a slug if not provided and handles duplicate slug errors.
     */
    async createOrganization(token, input) {
        const slug = input.slug || this.generateSlug(input.name);
        try {
            return await this.repository.create(token, {
                name: input.name,
                slug,
            });
        }
        catch (error) {
            // Handle PostgreSQL unique constraint violation (code 23505)
            if (error?.code === "23505") {
                throw new AppError(409, `Organization with slug '${slug}' already exists`);
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
     * Business Logic: Throws 404 error if organization is not found or not accessible.
     */
    async getOrganizationById(token, id) {
        const organization = await this.repository.findById(token, id);
        if (!organization) {
            throw new AppError(404, "Organization not found or access denied");
        }
        return organization;
    }
    /**
     * Updates an existing organization.
     * Business Logic: Validates organization existence and updates fields.
     */
    async updateOrganization(token, id, input) {
        // Check if organization exists first
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new AppError(404, "Organization not found or access denied");
        }
        try {
            const updated = await this.repository.update(token, id, input);
            if (!updated) {
                throw new AppError(403, "Forbidden: Only organization admins can update organization details");
            }
            return updated;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            if (error?.code === "23505") {
                throw new AppError(409, `Organization with slug '${input.slug}' already exists`);
            }
            throw error;
        }
    }
    /**
     * Deletes an organization.
     * Business Logic: Ensures organization exists and user has owner rights.
     */
    async deleteOrganization(token, id) {
        // Check if organization exists first
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new AppError(404, "Organization not found or access denied");
        }
        const deleted = await this.repository.delete(token, id);
        if (!deleted) {
            throw new AppError(403, "Forbidden: Only the organization owner can delete an organization");
        }
        return deleted;
    }
}
export const organizationService = new OrganizationService();
