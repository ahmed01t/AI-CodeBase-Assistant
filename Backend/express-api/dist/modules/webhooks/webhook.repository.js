import { supabase } from "../../lib/supabase.js";
import { getMongoDb } from "../../lib/mongodb.js";
export class WebhookRepository {
    /**
     * Logs an incoming webhook event into public.webhook_events.
     */
    async createWebhookEvent(data) {
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
    async updateWebhookEventStatus(eventId, status, errorMessage) {
        if (!eventId)
            return;
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
    async findRepositoryByFullNameOrUrl(fullName, htmlUrl) {
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
        if (repo)
            return repo;
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
    async deleteKnowledgeDocumentByPath(repositoryId, sourceUri) {
        await supabase
            .from("knowledge_documents")
            .delete()
            .eq("repository_id", repositoryId)
            .eq("source_uri", sourceUri);
    }
    /**
     * Updates or inserts a raw file in MongoDB raw_files.
     */
    async updateRawFile(doc) {
        const db = await getMongoDb();
        if (!db)
            return;
        await db.collection("raw_files").updateOne({ repository_id: doc.repository_id, path: doc.path }, { $set: doc }, { upsert: true });
    }
    /**
     * Deletes a raw file from MongoDB raw_files.
     */
    async deleteRawFile(repositoryId, filePath) {
        const db = await getMongoDb();
        if (!db)
            return;
        await db.collection("raw_files").deleteOne({
            repository_id: repositoryId,
            path: filePath,
        });
    }
    /**
     * Updates last_synced_at on repositories table.
     */
    async updateRepositoryLastSynced(repositoryId) {
        await supabase
            .from("repositories")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", repositoryId);
    }
}
export const webhookRepository = new WebhookRepository();
