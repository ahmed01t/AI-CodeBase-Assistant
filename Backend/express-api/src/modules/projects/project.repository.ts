import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.types.js";

/**
 * Project Repository
 * Handles database operations using the user-authenticated Supabase client.
 * Access control and multi-tenant organization boundaries are automatically
 * enforced by PostgreSQL Row Level Security (RLS) policies.
 */
export class ProjectRepository {
  /**
   * Inserts a new project into the database.
   * RLS policy (members_can_create_projects) validates that the caller
   * is a member of the specified organization_id.
   */
  async create(token: string, data: { organization_id: string; name: string; slug: string; description?: string }): Promise<Project> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: project, error } = await client
      .from("projects")
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return project as Project;
  }

  /**
   * Fetches all projects accessible to the authenticated user.
   * Optionally filters by organization_id if provided.
   * RLS policy (members_can_read_projects) automatically filters results to organizations the user belongs to.
   */
  async findAll(token: string, organizationId?: string): Promise<Project[]> {
    const client = getAuthenticatedSupabaseClient(token);

    let query = client
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: projects, error } = await query;

    if (error) {
      throw error;
    }

    return (projects || []) as Project[];
  }

  /**
   * Fetches a single project by ID.
   * RLS policy ensures users can only read projects from organizations they belong to.
   */
  async findById(token: string, id: string): Promise<Project | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: project, error } = await client
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return project as Project | null;
  }

  /**
   * Updates an existing project by ID.
   * RLS policy (members_can_update_projects) ensures only organization members can perform updates.
   */
  async update(
    token: string,
    id: string,
    data: UpdateProjectInput
  ): Promise<Project | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: updatedProject, error } = await client
      .from("projects")
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

    return updatedProject as Project | null;
  }

  /**
   * Deletes a project by ID.
   * RLS policy (admins_can_delete_projects) ensures only organization admins/owners can delete projects.
   */
  async delete(token: string, id: string): Promise<Project | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: deletedProject, error } = await client
      .from("projects")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return deletedProject as Project | null;
  }
}

export const projectRepository = new ProjectRepository();

