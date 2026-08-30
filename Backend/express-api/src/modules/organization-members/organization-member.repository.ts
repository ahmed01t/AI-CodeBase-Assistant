import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import type {
  OrganizationMember,
  OrganizationMemberWithProfile,
  OrganizationRole,
} from "./organization-member.types.js";

/**
 * Organization Member Repository
 * Handles all database queries for the organization_members table using Supabase.
 * Read access is protected by Row Level Security (RLS).
 */
export class OrganizationMemberRepository {
  /**
   * Fetches all members of a specific organization with joined profile details.
   */
  async findAllByOrganization(
    token: string,
    organizationId: string
  ): Promise<OrganizationMemberWithProfile[]> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: members, error } = await client
      .from("organization_members")
      .select("organization_id, user_id, role, joined_at, profiles(display_name, avatar_url)")
      .eq("organization_id", organizationId)
      .order("joined_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (members || []) as unknown as OrganizationMemberWithProfile[];
  }

  /**
   * Fetches a single member record by organization ID and user ID.
   */
  async findByOrganizationAndUser(
    token: string,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: member, error } = await client
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return member as OrganizationMember | null;
  }

  /**
   * Counts how many owners exist in the given organization.
   */
  async countOwners(token: string, organizationId: string): Promise<number> {
    const client = getAuthenticatedSupabaseClient(token);

    const { count, error } = await client
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner");

    if (error) {
      throw error;
    }

    return count || 0;
  }

  /**
   * Checks if a user profile exists in public.profiles table.
   */
  async userProfileExists(token: string, userId: string): Promise<boolean> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: profile, error } = await client
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return false;
    }

    return profile !== null;
  }

  /**
   * Adds an existing user as a member of an organization.
   */
  async create(
    token: string,
    data: { organization_id: string; user_id: string; role: OrganizationRole }
  ): Promise<OrganizationMember> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: member, error } = await client
      .from("organization_members")
      .insert({
        organization_id: data.organization_id,
        user_id: data.user_id,
        role: data.role,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return member as OrganizationMember;
  }

  /**
   * Updates an organization member's role.
   */
  async updateRole(
    token: string,
    organizationId: string,
    userId: string,
    newRole: OrganizationRole
  ): Promise<OrganizationMember | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: updatedMember, error } = await client
      .from("organization_members")
      .update({ role: newRole })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return updatedMember as OrganizationMember | null;
  }

  /**
   * Removes a member from an organization.
   */
  async delete(
    token: string,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: deletedMember, error } = await client
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return deletedMember as OrganizationMember | null;
  }
}

export const organizationMemberRepository = new OrganizationMemberRepository();

