/**
 * Project Data Model representing a row in public.projects
 */
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for creating a new project
 */
export interface CreateProjectInput {
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
}

/**
 * DTO for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string;
  slug?: string;
  description?: string;
}

