import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import { getMongoDb } from "../../lib/mongodb.js";
/**
 * Ingestion Repository
 * Manages PostgreSQL persistence for jobs and document metadata via Supabase,
 * and handles raw file persistence in MongoDB.
 */
export class IngestionRepository {
    /**
     * Creates a new ingestion_jobs record in PostgreSQL.
     */
    async createJob(token, repositoryId, jobType = "repository_sync") {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: job, error } = await client
            .from("ingestion_jobs")
            .insert({
            repository_id: repositoryId,
            job_type: jobType,
            status: "queued",
            progress: 0,
        })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return job;
    }
    /**
     * Updates an existing ingestion_jobs record in PostgreSQL.
     */
    async updateJob(token, jobId, updates) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: updatedJob, error } = await client
            .from("ingestion_jobs")
            .update(updates)
            .eq("id", jobId)
            .select()
            .maybeSingle();
        if (error) {
            throw error;
        }
        return updatedJob;
    }
    /**
     * Fetches an ingestion job by ID.
     */
    async findJobById(token, jobId) {
        const client = getAuthenticatedSupabaseClient(token);
        const { data: job, error } = await client
            .from("ingestion_jobs")
            .select("*")
            .eq("id", jobId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        return job;
    }
    /**
     * Upserts file metadata into PostgreSQL public.knowledge_documents
     */
    async upsertKnowledgeDocument(token, data) {
        const client = getAuthenticatedSupabaseClient(token);
        try {
            const { error } = await client.from("knowledge_documents").upsert({
                project_id: data.projectId,
                repository_id: data.repositoryId,
                source_type: "repository",
                title: data.title,
                source_uri: data.sourceUri,
                mime_type: data.mimeType,
                content_hash: data.contentHash,
                status: "indexed",
                updated_at: new Date().toISOString(),
            }, { onConflict: "project_id, source_uri" });
            if (error) {
                await client.from("knowledge_documents").insert({
                    project_id: data.projectId,
                    repository_id: data.repositoryId,
                    source_type: "repository",
                    title: data.title,
                    source_uri: data.sourceUri,
                    mime_type: data.mimeType,
                    content_hash: data.contentHash,
                    status: "indexed",
                });
            }
        }
        catch {
            // Ignore conflict error if document record already exists
        }
    }
    /**
     * Updates last_synced_at timestamp on the repositories table
     */
    async updateRepositoryLastSynced(token, repositoryId) {
        const client = getAuthenticatedSupabaseClient(token);
        await client
            .from("repositories")
            .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq("id", repositoryId);
    }
    /**
     * Stores raw file content and metadata in MongoDB raw_files collection
     */
    async storeRawFile(rawFile) {
        try {
            const db = await getMongoDb();
            if (!db) {
                return;
            }
            const collection = db.collection("raw_files");
            await collection.updateOne({ repository_id: rawFile.repository_id, path: rawFile.path }, { $set: rawFile }, { upsert: true });
        }
        catch (error) {
            console.warn(`[IngestionRepository] MongoDB store warning for ${rawFile.path}: ${error.message}`);
        }
    }
}
export const ingestionRepository = new IngestionRepository();
