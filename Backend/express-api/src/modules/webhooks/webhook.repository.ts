import { supabase } from "../../lib/supabase.js";
import { getMongoDb } from "../../lib/mongodb.js";
import { ApiError } from "../../utils/ApiError.js";
import type { RawFileDocument } from "../ingestion/ingestion.types.js";

export class WebhookRepository {
  /**
   * Logs an incoming webhook event into public.webhook_events.
   */
  public async createWebhookEvent(data: {
    repositoryId?: string | null;
    provider: "github";
    eventType: string;
    externalId?: string | null;
    payloadReference?: string | null;
  }): Promise<string> {
    const { data: record, error } = await supabase
      .from("webhook_events")
      .insert({
        repository_id: data.repositoryId || null,
        provider: data.provider,
        event_type: data.eventType,
        external_id: data.externalId || null,
        payload_reference: data.payloadReference || null,
        status: "received",
      })
      .select("id")
      .single();

    if (error || !record) {
      console.warn(`[WebhookRepository] Failed to log webhook event: ${error?.message}`);
      return "";
    }

    return record.id;
  }

  /**
   * Updates webhook event status to processing, processed, or failed.
   */
  public async updateWebhookEventStatus(
    eventId: string,
    status: "processing" | "processed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    if (!eventId) return;

    await supabase
      .from("webhook_events")
      .update({
        status,
        processed_at: status === "processed" || status === "failed" ? new Date().toISOString() : null,
        error: errorMessage || null,
      })
      .eq("id", eventId);
  }

  /**
   * Finds a connected repository in our database by its GitHub full_name or URL.
   */
  public async findRepositoryByFullNameOrUrl(
    fullName: string,
    htmlUrl: string
  ): Promise<{ id: string; project_id: string; owner: string; name: string; default_branch: string } | null> {
    const parts = fullName.split("/");
    const owner = parts[0];
    const name = parts[1] || "";

    // Query by owner and name first
    const { data: repo, error } = await supabase
      .from("repositories")
      .select("id, project_id, owner, name, default_branch")
      .eq("owner", owner)
      .eq("name", name)
      .maybeSingle();

    if (repo) return repo;

    // Fallback query by url
    const { data: repoByUrl } = await supabase
      .from("repositories")
      .select("id, project_id, owner, name, default_branch")
      .eq("url", htmlUrl)
      .maybeSingle();

    return repoByUrl || null;
  }

  /**
   * Deletes a knowledge_document from PostgreSQL by path (cascades to document_chunks and embeddings).
   */
  public async deleteKnowledgeDocumentByPath(repositoryId: string, sourceUri: string): Promise<void> {
    await supabase
      .from("knowledge_documents")
      .delete()
      .eq("repository_id", repositoryId)
      .eq("source_uri", sourceUri);
  }

  /**
   * Updates or inserts a raw file in MongoDB raw_files.
   */
  public async updateRawFile(doc: RawFileDocument): Promise<void> {
    const db = await getMongoDb();
    if (!db) return;

    await db.collection("raw_files").updateOne(
      { repository_id: doc.repository_id, path: doc.path },
      { $set: doc },
      { upsert: true }
    );
  }

  /**
   * Deletes a raw file from MongoDB raw_files.
   */
  public async deleteRawFile(repositoryId: string, filePath: string): Promise<void> {
    const db = await getMongoDb();
    if (!db) return;

    await db.collection("raw_files").deleteOne({
      repository_id: repositoryId,
      path: filePath,
    });
  }

  /**
   * Updates last_synced_at on repositories table.
   */
  public async updateRepositoryLastSynced(repositoryId: string): Promise<void> {
    await supabase
      .from("repositories")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", repositoryId);
  }
}

export const webhookRepository = new WebhookRepository();
