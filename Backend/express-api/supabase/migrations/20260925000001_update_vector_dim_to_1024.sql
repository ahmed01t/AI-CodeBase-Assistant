-- =========================================================
-- Migration: Update Vector Dimension to 1024 (Local Ollama) & Add Search RPC
-- =========================================================

-- 1. DROP EXISTING VECTOR INDEX
DROP INDEX IF EXISTS public.embeddings_embedding_hnsw_idx;

-- 2. TRUNCATE PREVIOUS MISMATCHED EMBEDDINGS (IF ANY)
TRUNCATE TABLE public.embeddings;

-- 3. ALTER EMBEDDING COLUMN TO 1024 DIMENSIONS (Ollama qwen3-embedding:0.6b)
ALTER TABLE public.embeddings
ALTER COLUMN embedding TYPE extensions.vector(1024);

-- 4. RECREATE HNSW COSINE SIMILARITY INDEX
CREATE INDEX embeddings_embedding_hnsw_idx
ON public.embeddings
USING hnsw (embedding extensions.vector_cosine_ops);

-- 5. CREATE VECTOR MATCH FUNCTION (RPC) FOR FAST SEMANTIC SEARCH
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding extensions.vector(1024),
    match_threshold float,
    match_count int,
    filter_project_id uuid,
    filter_repository_id uuid default null
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        dc.metadata
    FROM public.embeddings e
    JOIN public.document_chunks dc ON dc.id = e.chunk_id
    JOIN public.knowledge_documents kd ON kd.id = dc.document_id
    WHERE kd.project_id = filter_project_id
      AND (filter_repository_id IS NULL OR kd.repository_id = filter_repository_id)
      AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY e.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

