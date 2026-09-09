/**
 * Organization Data Model representing a row in public.organizations
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for creating a new organization
 */
export interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

/**
 * DTO for updating an existing organization
 */
export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

