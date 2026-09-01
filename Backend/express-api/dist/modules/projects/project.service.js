import { projectRepository } from "./project.repository.js";
import { ApiError } from "../../utils/ApiError.js";
/**
 * Project Service
 * Contains business rules and application logic for projects.
 * Delegates PostgreSQL operations to the repository layer.
 */
export class ProjectService {
    repository;
    constructor(repository = projectRepository) {
        this.repository = repository;
    } // when we create a project service  give it a project repository
    /**
     * Generates a URL-friendly slug from a project name
     * Example: "Mobile App Backend" -> "mobile-app-backend"
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/[\s_]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
    /**
     * Creates a new project inside an organization.
     * Business Logic: Auto-generates slug if omitted and handles organization membership and duplicate slug conflicts.
     */
    async createProject(token, input) {
        const slug = input.slug || this.generateSlug(input.name);
        try {
            return await this.repository.create(token, {
                organization_id: input.organization_id,
                name: input.name,
                slug,
                description: input.description,
            });
        }
        catch (error) {
            // Postgres error code 23505: Unique constraint violation (organization_id, slug)
            if (error?.code === "23505") {
                throw new ApiError(409, `Project with slug '${slug}' already exists in this organization`);
            }
            // Postgres RLS authorization failure / insufficient privileges
            if (error?.code === "42501") {
                throw new ApiError(403, `Forbidden: ${error.message || "You are not a member of this organization"}${error.details ? ` (${error.details})` : ""}`);
            }
            throw error;
        }
    }
    /**
     * Lists projects accessible to the authenticated user.
     */
    async listProjects(token, organizationId) {
        return await this.repository.findAll(token, organizationId);
    }
    /**
     * Retrieves a project by ID.
     * Business Logic: Throws 404 ApiError if project is not found or not accessible.
     */
    async getProjectById(token, id) {
        const project = await this.repository.findById(token, id);
        if (!project) {
            throw new ApiError(404, "Project not found or access denied");
        }
        return project;
    }
    /**
     * Updates an existing project by ID.
     * Business Logic: Ensures project exists and handles duplicate slug or permission failures.
     */
    async updateProject(token, id, input) {
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new ApiError(404, "Project not found or access denied");
        }
        try {
            const updated = await this.repository.update(token, id, input);
            if (!updated) {
                throw new ApiError(403, "Forbidden: You do not have permission to update this project");
            }
            return updated;
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            if (error?.code === "23505") {
                throw new ApiError(409, `Project with slug '${input.slug}' already exists in this organization`);
            }
            throw error;
        }
    }
    /**
     * Deletes a project by ID.
     * Business Logic: Ensures project exists and user has organization admin rights.
     */
    async deleteProject(token, id) {
        const existing = await this.repository.findById(token, id);
        if (!existing) {
            throw new ApiError(404, "Project not found or access denied");
        }
        const deleted = await this.repository.delete(token, id);
        if (!deleted) {
            throw new ApiError(403, "Forbidden: Only organization admins can delete projects");
        }
        return deleted;
    }
}
export const projectService = new ProjectService();
