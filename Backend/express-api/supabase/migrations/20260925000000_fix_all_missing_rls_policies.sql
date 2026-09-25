-- =========================================================
-- Migration: Fix Missing RLS Policies for Ingestion, Knowledge & AI Runtime
-- =========================================================

-- 1. INGESTION JOBS POLICIES
-- Allow org members to create and update ingestion jobs for their repositories
DROP POLICY IF EXISTS "members_can_insert_ingestion_jobs" ON public.ingestion_jobs;
CREATE POLICY "members_can_insert_ingestion_jobs"
ON public.ingestion_jobs FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = ingestion_jobs.repository_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_ingestion_jobs" ON public.ingestion_jobs;
CREATE POLICY "members_can_update_ingestion_jobs"
ON public.ingestion_jobs FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = ingestion_jobs.repository_id
          AND public.is_org_member(p.organization_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = ingestion_jobs.repository_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 2. KNOWLEDGE DOCUMENTS POLICIES
DROP POLICY IF EXISTS "members_can_insert_knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "members_can_insert_knowledge_documents"
ON public.knowledge_documents FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = knowledge_documents.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "members_can_update_knowledge_documents"
ON public.knowledge_documents FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = knowledge_documents.project_id
          AND public.is_org_member(p.organization_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = knowledge_documents.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "members_can_delete_knowledge_documents"
ON public.knowledge_documents FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = knowledge_documents.project_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 3. DOCUMENT CHUNKS POLICIES
DROP POLICY IF EXISTS "members_can_insert_document_chunks" ON public.document_chunks;
CREATE POLICY "members_can_insert_document_chunks"
ON public.document_chunks FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.knowledge_documents kd
        JOIN public.projects p ON p.id = kd.project_id
        WHERE kd.id = document_chunks.document_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_document_chunks" ON public.document_chunks;
CREATE POLICY "members_can_update_document_chunks"
ON public.document_chunks FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.knowledge_documents kd
        JOIN public.projects p ON p.id = kd.project_id
        WHERE kd.id = document_chunks.document_id
          AND public.is_org_member(p.organization_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.knowledge_documents kd
        JOIN public.projects p ON p.id = kd.project_id
        WHERE kd.id = document_chunks.document_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_document_chunks" ON public.document_chunks;
CREATE POLICY "members_can_delete_document_chunks"
ON public.document_chunks FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.knowledge_documents kd
        JOIN public.projects p ON p.id = kd.project_id
        WHERE kd.id = document_chunks.document_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 4. EMBEDDINGS POLICIES
DROP POLICY IF EXISTS "members_can_insert_embeddings" ON public.embeddings;
CREATE POLICY "members_can_insert_embeddings"
ON public.embeddings FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.document_chunks dc
        JOIN public.knowledge_documents kd ON kd.id = dc.document_id
        JOIN public.projects p ON p.id = kd.project_id
        WHERE dc.id = embeddings.chunk_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_embeddings" ON public.embeddings;
CREATE POLICY "members_can_update_embeddings"
ON public.embeddings FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_chunks dc
        JOIN public.knowledge_documents kd ON kd.id = dc.document_id
        JOIN public.projects p ON p.id = kd.project_id
        WHERE dc.id = embeddings.chunk_id
          AND public.is_org_member(p.organization_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.document_chunks dc
        JOIN public.knowledge_documents kd ON kd.id = dc.document_id
        JOIN public.projects p ON p.id = kd.project_id
        WHERE dc.id = embeddings.chunk_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_embeddings" ON public.embeddings;
CREATE POLICY "members_can_delete_embeddings"
ON public.embeddings FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_chunks dc
        JOIN public.knowledge_documents kd ON kd.id = dc.document_id
        JOIN public.projects p ON p.id = kd.project_id
        WHERE dc.id = embeddings.chunk_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 5. AGENT RUNS & STEPS POLICIES
DROP POLICY IF EXISTS "members_can_insert_agent_runs" ON public.agent_runs;
CREATE POLICY "members_can_insert_agent_runs"
ON public.agent_runs FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = agent_runs.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_agent_runs" ON public.agent_runs;
CREATE POLICY "members_can_update_agent_runs"
ON public.agent_runs FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = agent_runs.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_insert_agent_steps" ON public.agent_steps;
CREATE POLICY "members_can_insert_agent_steps"
ON public.agent_steps FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.agent_runs ar
        JOIN public.projects p ON p.id = ar.project_id
        WHERE ar.id = agent_steps.agent_run_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_update_agent_steps" ON public.agent_steps;
CREATE POLICY "members_can_update_agent_steps"
ON public.agent_steps FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.agent_runs ar
        JOIN public.projects p ON p.id = ar.project_id
        WHERE ar.id = agent_steps.agent_run_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 6. COMMITS, ISSUES, PULL REQUESTS POLICIES
DROP POLICY IF EXISTS "members_can_insert_commits" ON public.commits;
CREATE POLICY "members_can_insert_commits"
ON public.commits FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = commits.repository_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_insert_issues" ON public.issues;
CREATE POLICY "members_can_insert_issues"
ON public.issues FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = issues.repository_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_insert_pull_requests" ON public.pull_requests;
CREATE POLICY "members_can_insert_pull_requests"
ON public.pull_requests FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.repositories r
        JOIN public.projects p ON p.id = r.project_id
        WHERE r.id = pull_requests.repository_id
          AND public.is_org_member(p.organization_id)
    )
);

-- 7. CONVERSATIONS & MESSAGES POLICIES
DROP POLICY IF EXISTS "members_can_update_conversations" ON public.conversations;
CREATE POLICY "members_can_update_conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = conversations.project_id
          AND public.is_org_member(p.organization_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = conversations.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_conversations" ON public.conversations;
CREATE POLICY "members_can_delete_conversations"
ON public.conversations FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = conversations.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_messages" ON public.messages;
CREATE POLICY "members_can_delete_messages"
ON public.messages FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.projects p ON p.id = c.project_id
        WHERE c.id = messages.conversation_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_agent_runs" ON public.agent_runs;
CREATE POLICY "members_can_delete_agent_runs"
ON public.agent_runs FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = agent_runs.project_id
          AND public.is_org_member(p.organization_id)
    )
);

DROP POLICY IF EXISTS "members_can_delete_agent_steps" ON public.agent_steps;
CREATE POLICY "members_can_delete_agent_steps"
ON public.agent_steps FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.agent_runs ar
        JOIN public.projects p ON p.id = ar.project_id
        WHERE ar.id = agent_steps.agent_run_id
          AND public.is_org_member(p.organization_id)
    )
);

