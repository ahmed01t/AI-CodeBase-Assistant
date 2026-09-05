import { repositoryRepository } from "../repositories/repository.repository.js";
import { projectRepository } from "../projects/project.repository.js";
import { organizationMemberRepository } from "../organization-members/organization-member.repository.js";
import { ingestionRepository, IngestionRepository } from "./ingestion.repository.js";
import { ingestionWorker, IngestionWorker } from "./ingestion.worker.js";
import { ApiError } from "../../utils/ApiError.js";
import type { IngestionJob } from "./ingestion.types.js";

/**
 * Ingestion Service
 * Handles application business logic, access control verification, job creation,
 * and non-blocking worker execution for repository synchronization.
 */
export class IngestionService {
  constructor(
    private repository: IngestionRepository = ingestionRepository,
    private worker: IngestionWorker = ingestionWorker
  ) {}

  /**
   * Verifies caller's authorization to access the repository.
   */
  private async verifyRepositoryAccess(
    token: string,
    userId: string,
    repositoryId: string
  ) {
    // 1. Fetch repository record
    const repo = await repositoryRepository.findById(token, repositoryId);
    if (!repo) {
      throw new ApiError(404, "Repository not found or access denied");
    }

    // 2. Fetch associated project record
    const project = await projectRepository.findById(token, repo.project_id);
    if (!project) {
      throw new ApiError(404, "Project not found or access denied");
    }

    // 3. Verify user membership in the project's organization
    const member = await organizationMemberRepository.findByOrganizationAndUser(
      token,
      project.organization_id,
      userId
    );

    if (!member) {
      throw new ApiError(403, "Forbidden: You are not a member of this organization");
    }

    return { repo, project, member };
  }

  /**
   * Triggers background synchronization for a repository.
   * Verifies access, queues an ingestion_jobs record, spawns the background worker asynchronously,
   * and returns immediately without blocking HTTP execution.
   */
  async triggerSync(
    token: string,
    userId: string,
    repositoryId: string,
    customGithubToken?: string
  ): Promise<IngestionJob> {
    // A. Enforce authorization and retrieve repository details
    const { repo, project } = await this.verifyRepositoryAccess(token, userId, repositoryId);

    // B. Insert ingestion_jobs record into PostgreSQL with status = 'queued'
    const job = await this.repository.createJob(token, repositoryId, "repository_sync");

    // C. Non-blocking asynchronous worker launch using setImmediate
    setImmediate(() => {
      this.worker
        .runJob({
          jobId: job.id,
          repositoryId: repo.id,
          projectId: project.id,
          owner: repo.owner,
          repo: repo.name,
          defaultBranch: repo.default_branch || "main",
          userToken: token,
          customGithubToken,
        })
        .catch((err) => {
          console.error(`[IngestionService] Background worker execution exception:`, err);
        });
    });

    // D. Return immediately with queued job details
    return job;
  }

  /**
   * Retrieves current status and progress of an ingestion job.
   */
  async getJobStatus(token: string, jobId: string): Promise<IngestionJob> {
    const job = await this.repository.findJobById(token, jobId);
    if (!job) {
      throw new ApiError(404, "Ingestion job not found");
    }
    return job;
  }
}

export const ingestionService = new IngestionService();

