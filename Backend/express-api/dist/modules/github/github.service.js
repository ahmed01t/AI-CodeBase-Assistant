import { githubClient } from "./github.client.js";
/**
 * GitHub Service
 * Responsible for application-level GitHub operations.
 * Uses GitHubClient to fetch raw API payloads and maps them into application domain models.
 */
export class GitHubService {
    client;
    constructor(client = githubClient) {
        this.client = client;
    }
    /**
     * Retrieves clean repository metadata for a given GitHub owner and repository name.
     * Maps raw GitHub REST response into clean GitHubRepoMetadata model.
     */
    async getRepoMetadata(input) {
        const rawRepo = await this.client.fetchRepoMetadata(input.owner, input.repo, input.customToken);
        // Determine visibility status ('public' or 'private')
        const visibility = rawRepo.visibility || (rawRepo.private ? "private" : "public");
        // Map raw API payload into application domain model
        return {
            github_id: rawRepo.id,
            name: rawRepo.name,
            full_name: rawRepo.full_name,
            owner: rawRepo.owner.login,
            default_branch: rawRepo.default_branch,
            visibility,
            url: rawRepo.html_url,
            description: rawRepo.description,
            stargazers_count: rawRepo.stargazers_count || 0,
            forks_count: rawRepo.forks_count || 0,
            open_issues_count: rawRepo.open_issues_count || 0,
        };
    }
}
export const githubService = new GitHubService();
