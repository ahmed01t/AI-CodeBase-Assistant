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

/**
 * Single item in a GitHub Git Tree (file or directory)
 */
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size?: number;
  url?: string;
}

/**
 * Response payload structure from GitHub GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1
 */
export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

/**
 * Response payload structure from GitHub GET /repos/{owner}/{repo}/contents/{path}
 */
export interface GitHubFileContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  type: string;
  content?: string;
  encoding?: string;
}
