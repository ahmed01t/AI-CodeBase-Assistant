import { repositoryRepository, RepositoryRepository } from "./repository.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import type {
  Repository,
  CreateRepositoryInput,
} from "./repository.types.js";

/**
 * Repository Service
 * Contains business logic for managing internal repository resources.
 * Verifies project access and organization boundaries before executing database queries.
 * (Note: Does not interact with external provider APIs like GitHub REST/GraphQL).
 */
export class RepositoryService {
  constructor(
    private repository: RepositoryRepository = repositoryRepository
  ) {}

  /**
   * Creates a new repository record associated with a project.
   * Business Logic:
   * 1. Verifies that the project exists and the user belongs to its organization.
   * 2. Auto-constructs full_name if omitted (owner/name).
   * 3. Handles duplicate provider & external_id conflicts.
   */
  async createRepository(
    token: string,
    input: CreateRepositoryInput
  ): Promise<Repository> {
    // 1. Verify project exists and user has organization access
    const hasAccess = await this.repository.checkProjectAccess(token, input.project_id);
    if (!hasAccess) {
      throw new ApiError(404, "Project not found or access denied");
    }

    // 2. Derive defaults
    const provider = input.provider || "github";
    const defaultBranch = input.default_branch || "main";
    const isActive = input.is_active !== undefined ? input.is_active : true;
    const fullName = input.full_name || `${input.owner}/${input.name}`;

    try {
      return await this.repository.create(token, {
        project_id: input.project_id,
        provider,
        external_id: input.external_id,
        owner: input.owner,
        name: input.name,
        full_name: fullName,
        default_branch: defaultBranch,
        url: input.url,
        is_active: isActive,
      });
    } catch (error: any) {
      // Postgres error code 23505: Unique constraint violation (provider, external_id)
      if (error?.code === "23505") {
        throw new ApiError(
          409,
          `Repository with provider '${provider}' and external ID '${input.external_id}' already exists`
        );
      }
      // Postgres RLS failure / permission denied
      if (error?.code === "42501") {
        throw new ApiError(
          403,
          "Forbidden: You do not have permission to add repositories to this project"
        );
      }
      throw error;
    }
  }

  /**
   * Lists repositories for a project (or all accessible repositories if project_id is omitted).
   */
  async listRepositories(token: string, projectId?: string): Promise<Repository[]> {
    if (projectId) {
      const hasAccess = await this.repository.checkProjectAccess(token, projectId);
      if (!hasAccess) {
        throw new ApiError(404, "Project not found or access denied");
      }
      return await this.repository.findAllByProject(token, projectId);
    }

    return await this.repository.findAll(token);
  }

  /**
   * Retrieves a single repository by ID.
   * Business Logic: Throws 404 ApiError if repository is not found or not accessible.
   */
  async getRepositoryById(token: string, id: string): Promise<Repository> {
    const repo = await this.repository.findById(token, id);

    if (!repo) {
      throw new ApiError(404, "Repository not found or access denied");
    }

    return repo;
  }

  /**
   * Deletes a repository by ID.
   * Business Logic: Verifies repository exists and user has organization admin rights.
   */
  async deleteRepository(token: string, id: string): Promise<Repository> {
    const existing = await this.repository.findById(token, id);
    if (!existing) {
      throw new ApiError(404, "Repository not found or access denied");
    }

    const deleted = await this.repository.delete(token, id);

    if (!deleted) {
      throw new ApiError(
        403,
        "Forbidden: Only organization admins can delete repositories"
      );
    }

    return deleted;
  }
}

export const repositoryService = new RepositoryService();

