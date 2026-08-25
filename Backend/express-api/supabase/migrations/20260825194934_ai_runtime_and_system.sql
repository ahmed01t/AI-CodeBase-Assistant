-- =========================================================
-- Migration 004: AI Runtime & System
-- =========================================================


-- =========================================================
-- 1. CONVERSATIONS
-- Stores an AI conversation belonging to a project/user.
-- =========================================================

create table public.conversations (
    id uuid primary key
        default gen_random_uuid(),

    project_id uuid not null
        references public.projects(id)
        on delete cascade,

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    title text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now()
);


-- =========================================================
-- 2. MESSAGES
-- Stores individual messages inside a conversation.
-- =========================================================

create table public.messages (
    id uuid primary key
        default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on delete cascade,

    role text not null,

    content text not null,

    created_at timestamptz not null
        default now(),

    constraint messages_role_check
        check (
            role in ('system', 'user', 'assistant', 'tool')
        )
);


-- =========================================================
-- 3. AGENT RUNS
-- Represents one complete execution of an AI agent.
-- =========================================================

create table public.agent_runs (
    id uuid primary key
        default gen_random_uuid(),

    conversation_id uuid
        references public.conversations(id)
        on delete set null,

    project_id uuid not null
        references public.projects(id)
        on delete cascade,

    agent_type text not null,

    status text not null
        default 'queued',

    started_at timestamptz,

    completed_at timestamptz,

    error text,

    created_at timestamptz not null
        default now(),

    constraint agent_runs_status_check
        check (
            status in (
                'queued',
                'running',
                'completed',
                'failed',
                'cancelled'
            )
        )
);


-- =========================================================
-- 4. AGENT STEPS
-- Stores the individual operations performed during an agent run.
-- =========================================================

create table public.agent_steps (
    id uuid primary key
        default gen_random_uuid(),

    agent_run_id uuid not null
        references public.agent_runs(id)
        on delete cascade,

    step_number integer not null,

    step_type text not null,

    tool_name text,

    input jsonb,

    output jsonb,

    status text not null
        default 'running',

    started_at timestamptz,

    completed_at timestamptz,

    created_at timestamptz not null
        default now(),

    constraint agent_steps_status_check
        check (
            status in (
                'running',
                'completed',
                'failed'
            )
        ),

    constraint agent_steps_run_step_unique
        unique (agent_run_id, step_number)
);


-- =========================================================
-- 5. INGESTION JOBS
-- Tracks repository indexing/synchronization work.
-- =========================================================

create table public.ingestion_jobs (
    id uuid primary key
        default gen_random_uuid(),

    repository_id uuid not null
        references public.repositories(id)
        on delete cascade,

    job_type text not null,

    status text not null
        default 'queued',

    progress integer not null
        default 0,

    started_at timestamptz,

    completed_at timestamptz,

    error text,

    created_at timestamptz not null
        default now(),

    constraint ingestion_jobs_progress_check
        check (progress between 0 and 100),

    constraint ingestion_jobs_status_check
        check (
            status in (
                'queued',
                'running',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    constraint ingestion_jobs_type_check
        check (
            job_type in (
                'repository_sync',
                'repository_index',
                'incremental_index'
            )
        )
);


-- =========================================================
-- 6. WEBHOOK EVENTS
-- Stores metadata about webhook events received from GitHub
-- or another repository provider.
-- =========================================================

create table public.webhook_events (
    id uuid primary key
        default gen_random_uuid(),

    repository_id uuid
        references public.repositories(id)
        on delete set null,

    provider text not null,

    event_type text not null,

    external_id text,

    payload_reference text,

    status text not null
        default 'received',

    received_at timestamptz not null
        default now(),

    processed_at timestamptz,

    error text,

    constraint webhook_events_status_check
        check (
            status in (
                'received',
                'processing',
                'processed',
                'failed'
            )
        )
);


-- =========================================================
-- 7. AUDIT LOGS
-- Records important actions performed by users/system.
-- =========================================================

create table public.audit_logs (
    id uuid primary key
        default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    user_id uuid
        references public.profiles(id)
        on delete set null,

    action text not null,

    resource_type text,

    resource_id uuid,

    metadata jsonb
        default '{}'::jsonb,

    created_at timestamptz not null
        default now()
);


-- =========================================================
-- 8. INDEXES
-- =========================================================

create index conversations_project_id_idx
    on public.conversations(project_id);

create index conversations_user_id_idx
    on public.conversations(user_id);

create index messages_conversation_id_idx
    on public.messages(conversation_id);

create index agent_runs_project_id_idx
    on public.agent_runs(project_id);

create index agent_runs_conversation_id_idx
    on public.agent_runs(conversation_id);

create index agent_runs_status_idx
    on public.agent_runs(status);

create index agent_steps_agent_run_id_idx
    on public.agent_steps(agent_run_id);

create index ingestion_jobs_repository_id_idx
    on public.ingestion_jobs(repository_id);

create index ingestion_jobs_status_idx
    on public.ingestion_jobs(status);

create index webhook_events_repository_id_idx
    on public.webhook_events(repository_id);

create index webhook_events_status_idx
    on public.webhook_events(status);

create index audit_logs_organization_id_idx
    on public.audit_logs(organization_id);

create index audit_logs_user_id_idx
    on public.audit_logs(user_id);

create index audit_logs_created_at_idx
    on public.audit_logs(created_at);