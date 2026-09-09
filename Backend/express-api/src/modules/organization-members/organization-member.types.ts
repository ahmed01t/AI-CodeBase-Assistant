/**
 * Organization Member Roles
 */
export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

/**
 * Organization Member Data Model
 */
export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

/**
 * Organization Member with Profile details joined
 */
export interface OrganizationMemberWithProfile extends OrganizationMember {
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * DTO for adding an existing user as an organization member
 */
export interface AddMemberInput {
  user_id: string;
  role: OrganizationRole;
}

/**
 * DTO for updating an organization member's role
 */
export interface UpdateMemberRoleInput {
  role: OrganizationRole;
}

