import { getAuthenticatedSupabaseClient } from "../../lib/supabase.js";
import { getMongoDb } from "../../lib/mongodb.js";
import type { IngestionJob, RawFileDocument } from "./ingestion.types.js";

/**
 * Ingestion Repository
 * Manages PostgreSQL persistence for jobs and document metadata via Supabase,
 * and handles raw file persistence in MongoDB.
 */
export class IngestionRepository {
  /**
   * Creates a new ingestion_jobs record in PostgreSQL.
   */
  async createJob(
    token: string,
    repositoryId: string,
    jobType: "repository_sync" | "repository_index" | "incremental_index" = "repository_sync"
  ): Promise<IngestionJob> {
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

    return job as IngestionJob;
  }

  /**
   * Updates an existing ingestion_jobs record in PostgreSQL.
   */
  async updateJob(
    token: string,
    jobId: string,
    updates: {
      status?: "queued" | "running" | "completed" | "failed" | "cancelled";
      progress?: number;
      started_at?: string;
      completed_at?: string;
      error?: string | null;
    }
  ): Promise<IngestionJob | null> {
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

    return updatedJob as IngestionJob | null;
  }

  /**
   * Fetches an ingestion job by ID.
   */
  async findJobById(token: string, jobId: string): Promise<IngestionJob | null> {
    const client = getAuthenticatedSupabaseClient(token);

    const { data: job, error } = await client
      .from("ingestion_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return job as IngestionJob | null;
  }

  /**
   * Upserts file metadata into PostgreSQL public.knowledge_documents
   */
  async upsertKnowledgeDocument(
    token: string,
    data: {
      projectId: string;
      repositoryId: string;
      title: string;
      sourceUri: string;
      mimeType: string;
      contentHash: string;
    }
  ): Promise<void> {
    const client = getAuthenticatedSupabaseClient(token);

    try {
      const { error } = await client.from("knowledge_documents").upsert(
        {
          project_id: data.projectId,
          repository_id: data.repositoryId,
          source_type: "repository",
          title: data.title,
          source_uri: data.sourceUri,
          mime_type: data.mimeType,
          content_hash: data.contentHash,
          status: "indexed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id, source_uri" }
      );

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
    } catch {
      // Ignore conflict error if document record already exists
    }
  }

  /**
   * Updates last_synced_at timestamp on the repositories table
   */
  async updateRepositoryLastSynced(token: string, repositoryId: string): Promise<void> {
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
  async storeRawFile(rawFile: RawFileDocument): Promise<void> {
    try {
      const db = await getMongoDb();
      if (!db) {
        return;
      }

      const collection = db.collection("raw_files");

      await collection.updateOne(
        { repository_id: rawFile.repository_id, path: rawFile.path },
        { $set: rawFile },
        { upsert: true }
      );
    } catch (error: any) {
      console.warn(`[IngestionRepository] MongoDB store warning for ${rawFile.path}: ${error.message}`);
    }
  }
}

export const ingestionRepository = new IngestionRepository();

