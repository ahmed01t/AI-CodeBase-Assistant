import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "./organization.types.js";

/**
 * Organization Repository
 * Handles all database queries using the Supabase client.
 * Database security and access control are automatically enforced
 * by PostgreSQL Row Level Security (RLS) policies.
 */
export class OrganizationRepository {
  /**
   * Inserts a new organization into the database.
   * Postgres RLS allows authenticated users to insert, and a trigger
   * automatically registers the creator as the 'owner' in organization_members.
   */
  async create(token: string, data: { name: string; slug: string }): Promise<Organization> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: organization, error } = await client
      .from("organizations")
      .insert({
        name: data.name,
        slug: data.slug,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return organization as Organization;
  }

  /**
   * Fetches all organizations accessible to the authenticated user.
   * Postgres RLS policy (members_can_read_organizations) automatically
   * filters results to only return organizations the user belongs to.
   */
  async findAll(token: string): Promise<Organization[]> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: organizations, error } = await client
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (organizations || []) as Organization[];
  }

  /**
   * Fetches a single organization by ID.
   * Postgres RLS policy ensures users can only read organizations they belong to.
   */
  async findById(token: string, id: string): Promise<Organization | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: organization, error } = await client
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return organization as Organization | null;
  }

  /**
   * Updates an existing organization by ID.
   * Postgres RLS policy (admins_can_update_organizations) ensures only
   * organization owners and admins can perform updates.
   */
  async update(
    token: string,
    id: string,
    data: UpdateOrganizationInput
  ): Promise<Organization | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: updatedOrganization, error } = await client
      .from("organizations")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return updatedOrganization as Organization | null;
  }

  /**
   * Deletes an organization by ID.
   * Postgres RLS policy (owners_can_delete_organizations) ensures only
   * organization owners can delete an organization.
   */
  async delete(token: string, id: string): Promise<Organization | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: deletedOrganization, error } = await client
      .from("organizations")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return deletedOrganization as Organization | null;
  }
}

export const organizationRepository = new OrganizationRepository();

