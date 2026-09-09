import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
/**
 * Repository Data Layer
 * Handles database operations for the public.repositories table using Supabase.
 * RLS policies automatically filter queries to only projects and organizations
 * accessible to the authenticated user.
 */
export class RepositoryRepository {
    /**
     * Checks if a project exists and is accessible to the current authenticated user.
     * Leverages RLS policy (members_can_read_projects).
     */
    async checkProjectAccess(token, projectId) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: project, error } = await client
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .maybeSingle();
        if (error) {
            return false;
        }
        return project !== null;
    }
    /**
     * Inserts a new repository record into the database.
     * RLS policy (members_can_create_repositories) ensures caller belongs
     * to the organization owning the target project.
     */
    async create(token, data) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: repository, error } = await client
            .from("repositories")
            .insert({
            project_id: data.project_id,
            provider: data.provider,
            external_id: data.external_id,
            owner: data.owner,
            name: data.name,
            full_name: data.full_name,
            default_branch: data.default_branch,
            url: data.url,
            is_active: data.is_active,
        })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return repository;
    }
    /**
     * Fetches all repositories belonging to a specific project.
     * RLS policy (members_can_read_repositories) enforces organization membership.
     */
    async findAllByProject(token, projectId) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: repositories, error } = await client
            .from("repositories")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });
        if (error) {
            throw error;
        }
        return (repositories || []);
    }
    /**
     * Fetches all repositories accessible to the user across projects.
     * RLS policy (members_can_read_repositories) filters results automatically.
     */
    async findAll(token) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: repositories, error } = await client
            .from("repositories")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) {
            throw error;
        }
        return (repositories || []);
    }
    /**
     * Fetches a single repository by ID.
     * RLS policy ensures users can only read repositories they have access to.
     */
    async findById(token, id) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: repository, error } = await client
            .from("repositories")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) {
            throw error;
        }
        return repository;
    }
    /**
     * Deletes a repository by ID.
     * RLS policy (admins_can_delete_repositories) ensures only organization owners/admins can delete.
     */
    async delete(token, id) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: deletedRepository, error } = await client
            .from("repositories")
            .delete()
            .eq("id", id)
            .select()
            .maybeSingle();
        if (error) {
            throw error;
        }
        return deletedRepository;
    }
}
export const repositoryRepository = new RepositoryRepository();
