/**
 * Clean application-level GitHub Repository Metadata Model
 */
export interface GitHubRepoMetadata {
  github_id: number;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  visibility: string;
  url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

/**
 * Raw response payload structure from GitHub REST API GET /repos/{owner}/{repo}
 */
export interface GitHubRawRepoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  default_branch: string;
  visibility?: string;
  private?: boolean;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

/**
 * Input DTO for fetching repository metadata by owner and name
 */
export interface GetRepoMetadataInput {
  owner: string;
  repo: string;
  customToken?: string;
}

