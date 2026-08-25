-- =========================================================
-- Migration 003: GitHub & Knowledge
-- =========================================================

-- =========================================================
-- Migration 003: GitHub & Knowledge
-- =========================================================

create extension if not exists vector
with schema extensions;
-- =========================================================
-- 1. COMMITS
-- Stores important Git commit metadata.
-- =========================================================

create table public.commits (
    id uuid primary key
        default gen_random_uuid(),

    repository_id uuid not null
        references public.repositories(id)
        on delete cascade,

    external_id text not null,

    author_name text,

    author_email text,

    message text not null,

    branch text,

    committed_at timestamptz not null,

    url text,

    created_at timestamptz not null
        default now(),

    constraint commits_repository_external_id_unique
        unique (repository_id, external_id)
);


-- =========================================================
-- 2. ISSUES
-- Stores GitHub issue metadata.
-- =========================================================

create table public.issues (
    id uuid primary key
        default gen_random_uuid(),

    repository_id uuid not null
        references public.repositories(id)
        on delete cascade,

    external_id text not null,

    title text not null,

    body text,

    state text not null,

    author text,

    opened_at timestamptz,

    closed_at timestamptz,

    url text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint issues_repository_external_id_unique
        unique (repository_id, external_id),

    constraint issues_state_check
        check (state in ('open', 'closed'))
);


-- =========================================================
-- 3. PULL REQUESTS
-- Stores GitHub pull request metadata.
-- =========================================================

create table public.pull_requests (
    id uuid primary key
        default gen_random_uuid(),

    repository_id uuid not null
        references public.repositories(id)
        on delete cascade,

    external_id text not null,

    title text not null,

    body text,

    state text not null,

    author text,

    source_branch text,

    target_branch text,

    merged_at timestamptz,

    url text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint pull_requests_repository_external_id_unique
        unique (repository_id, external_id),

    constraint pull_requests_state_check
        check (state in ('open', 'closed'))
);


-- =========================================================
-- 4. KNOWLEDGE DOCUMENTS
-- Represents anything that can become searchable knowledge.
-- =========================================================

create table public.knowledge_documents (
    id uuid primary key
        default gen_random_uuid(),

    project_id uuid not null
        references public.projects(id)
        on delete cascade,

    repository_id uuid
        references public.repositories(id)
        on delete set null,

    source_type text not null,

    title text not null,

    source_uri text,

    mime_type text,

    content_hash text,

    status text not null
        default 'pending',

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint knowledge_documents_source_type_check
        check (
            source_type in (
                'repository',
                'upload',
                'github_issue',
                'github_pr',
                'generated',
                'manual'
            )
        ),

    constraint knowledge_documents_status_check
        check (
            status in (
                'pending',
                'processing',
                'indexed',
                'failed'
            )
        )
);


-- =========================================================
-- 5. DOCUMENT CHUNKS
-- Logical pieces used by the RAG system.
-- =========================================================

create table public.document_chunks (
    id uuid primary key
        default gen_random_uuid(),

    document_id uuid not null
        references public.knowledge_documents(id)
        on delete cascade,

    content text not null,

    chunk_index integer not null,

    token_count integer,

    metadata jsonb
        default '{}'::jsonb,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint document_chunks_document_index_unique
        unique (document_id, chunk_index)
);


-- =========================================================
-- 6. EMBEDDINGS
-- Stores vector representations for semantic search.
-- =========================================================

create table public.embeddings (
    id uuid primary key
        default gen_random_uuid(),

    chunk_id uuid not null
        references public.document_chunks(id)
        on delete cascade,

    model text not null,

    embedding extensions.vector(1024),

    created_at timestamptz not null
        default now(),

    constraint embeddings_chunk_unique
        unique (chunk_id)
);


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index commits_repository_id_idx
    on public.commits(repository_id);

create index commits_committed_at_idx
    on public.commits(committed_at);

create index issues_repository_id_idx
    on public.issues(repository_id);

create index pull_requests_repository_id_idx
    on public.pull_requests(repository_id);

create index knowledge_documents_project_id_idx
    on public.knowledge_documents(project_id);

create index knowledge_documents_repository_id_idx
    on public.knowledge_documents(repository_id);

create index document_chunks_document_id_idx
    on public.document_chunks(document_id);

create index embeddings_chunk_id_idx
    on public.embeddings(chunk_id);


-- =========================================================
-- 8. VECTOR INDEX
-- =========================================================
