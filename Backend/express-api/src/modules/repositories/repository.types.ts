/**
 * Repository Provider Types
 */
export type RepositoryProvider = "github" | "gitlab" | "bitbucket";

/**
 * Repository Data Model representing a row in public.repositories
 */
export interface Repository {
  id: string;
  project_id: string;
  provider: RepositoryProvider;
  external_id: string;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  url: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for creating a new repository record
 */
export interface CreateRepositoryInput {
  project_id: string;
  provider?: RepositoryProvider;
  external_id: string;
  owner: string;
  name: string;
  full_name?: string;
  default_branch?: string;
  url: string;
  is_active?: boolean;
}

