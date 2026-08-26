-- =========================================================
-- Migration 005: Enable RLS & Core Security Policies
-- =========================================================


-- =========================================================
-- 1. HELPER FUNCTIONS
-- =========================================================

-- Check whether the current authenticated user belongs
-- to a particular organization.
--
-- SECURITY DEFINER allows this function to safely check
-- organization membership without getting trapped by RLS
-- policies on organization_members.
create or replace function public.is_org_member(
    target_organization_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members om
        where om.organization_id = target_organization_id
          and om.user_id = auth.uid()
    );
$$;


-- Check whether the current user is an owner or admin
-- of an organization.
create or replace function public.is_org_admin(
    target_organization_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organization_members om
        where om.organization_id = target_organization_id
          and om.user_id = auth.uid()
          and om.role in ('owner', 'admin')
    );
$$;


-- =========================================================
-- 2. AUTOMATICALLY ADD ORGANIZATION CREATOR AS OWNER
-- =========================================================

create or replace function public.create_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    if auth.uid() is not null then
        insert into public.organization_members (
            organization_id,
            user_id,
            role
        )
        values (
            new.id,
            auth.uid(),
            'owner'
        );
    end if;

    return new;
end;
$$;


create trigger on_organization_created
after insert on public.organizations
for each row
execute function public.create_organization_owner();


-- =========================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles
enable row level security;

alter table public.organizations
enable row level security;

alter table public.organization_members
enable row level security;

alter table public.projects
enable row level security;

alter table public.repositories
enable row level security;

alter table public.commits
enable row level security;

alter table public.issues
enable row level security;

alter table public.pull_requests
enable row level security;

alter table public.knowledge_documents
enable row level security;

alter table public.document_chunks
enable row level security;

alter table public.embeddings
enable row level security;

alter table public.conversations
enable row level security;

alter table public.messages
enable row level security;

alter table public.agent_runs
enable row level security;

alter table public.agent_steps
enable row level security;

alter table public.ingestion_jobs
enable row level security;

alter table public.webhook_events
enable row level security;

alter table public.audit_logs
enable row level security;


-- =========================================================
-- 4. PROFILES POLICIES
-- =========================================================

-- Authenticated users can read profiles.
create policy "authenticated_users_can_read_profiles"
on public.profiles
for select
to authenticated
using (
    true
);


-- Users can create their own profile.
create policy "users_can_create_own_profile"
on public.profiles
for insert
to authenticated
with check (
    id = auth.uid()
);


-- Users can update their own profile.
create policy "users_can_update_own_profile"
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
)
with check (
    id = auth.uid()
);


-- =========================================================
-- 5. ORGANIZATION POLICIES
-- =========================================================

-- Members can see organizations they belong to.
create policy "members_can_read_organizations"
on public.organizations
for select
to authenticated
using (
    public.is_org_member(id)
);


-- Any authenticated user can create an organization.
-- The trigger above automatically makes the creator
-- the organization owner.
create policy "authenticated_users_can_create_organizations"
on public.organizations
for insert
to authenticated
with check (
    true
);


-- Only owners/admins can update an organization.
create policy "admins_can_update_organizations"
on public.organizations
for update
to authenticated
using (
    public.is_org_admin(id)
)
with check (
    public.is_org_admin(id)
);


-- Only owners can delete an organization.
create policy "owners_can_delete_organizations"
on public.organizations
for delete
to authenticated
using (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id = organizations.id
          and om.user_id = auth.uid()
          and om.role = 'owner'
    )
);


-- =========================================================
-- 6. ORGANIZATION MEMBER POLICIES
-- =========================================================

-- Members can see other members of organizations they belong to.
create policy "members_can_read_members"
on public.organization_members
for select
to authenticated
using (
    public.is_org_member(organization_id)
);


-- Admins/owners can add members.
create policy "admins_can_add_members"
on public.organization_members
for insert
to authenticated
with check (
    public.is_org_admin(organization_id)
);


-- Admins/owners can update member roles.
create policy "admins_can_update_members"
on public.organization_members
for update
to authenticated
using (
    public.is_org_admin(organization_id)
)
with check (
    public.is_org_admin(organization_id)
);


-- Admins/owners can remove members.
create policy "admins_can_remove_members"
on public.organization_members
for delete
to authenticated
using (
    public.is_org_admin(organization_id)
);


-- =========================================================
-- 7. PROJECT POLICIES
-- =========================================================

-- Organization members can see projects in their organization.
create policy "members_can_read_projects"
on public.projects
for select
to authenticated
using (
    public.is_org_member(organization_id)
);


-- Organization members can create projects.
create policy "members_can_create_projects"
on public.projects
for insert
to authenticated
with check (
    public.is_org_member(organization_id)
);


-- Organization members can update projects.
create policy "members_can_update_projects"
on public.projects
for update
to authenticated
using (
    public.is_org_member(organization_id)
)
with check (
    public.is_org_member(organization_id)
);


-- Organization admins/owners can delete projects.
create policy "admins_can_delete_projects"
on public.projects
for delete
to authenticated
using (
    public.is_org_admin(organization_id)
);


-- =========================================================
-- 8. REPOSITORY POLICIES
-- =========================================================

-- Members can read repositories belonging to projects
-- in their organization.
create policy "members_can_read_repositories"
on public.repositories
for select
to authenticated
using (
    exists (
        select 1
        from public.projects p
        where p.id = repositories.project_id
          and public.is_org_member(p.organization_id)
    )
);


-- Members can connect/add repositories to projects
-- they have access to.
create policy "members_can_create_repositories"
on public.repositories
for insert
to authenticated
with check (
    exists (
        select 1
        from public.projects p
        where p.id = repositories.project_id
          and public.is_org_member(p.organization_id)
    )
);


-- Members can update repository metadata.
create policy "members_can_update_repositories"
on public.repositories
for update
to authenticated
using (
    exists (
        select 1
        from public.projects p
        where p.id = repositories.project_id
          and public.is_org_member(p.organization_id)
    )
)
with check (
    exists (
        select 1
        from public.projects p
        where p.id = repositories.project_id
          and public.is_org_member(p.organization_id)
    )
);


-- Only organization admins/owners can delete repositories.
create policy "admins_can_delete_repositories"
on public.repositories
for delete
to authenticated
using (
    exists (
        select 1
        from public.projects p
        where p.id = repositories.project_id
          and public.is_org_admin(p.organization_id)
    )
);


-- =========================================================
-- 9. COMMITS, ISSUES, PULL REQUESTS POLICIES
-- =========================================================

create policy "members_can_read_commits"
on public.commits for select to authenticated
using (
    exists (
        select 1 from public.repositories r
        join public.projects p on p.id = r.project_id
        where r.id = commits.repository_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_issues"
on public.issues for select to authenticated
using (
    exists (
        select 1 from public.repositories r
        join public.projects p on p.id = r.project_id
        where r.id = issues.repository_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_pull_requests"
on public.pull_requests for select to authenticated
using (
    exists (
        select 1 from public.repositories r
        join public.projects p on p.id = r.project_id
        where r.id = pull_requests.repository_id
          and public.is_org_member(p.organization_id)
    )
);


-- =========================================================
-- 10. KNOWLEDGE DOCUMENTS, CHUNKS, EMBEDDINGS POLICIES
-- =========================================================

create policy "members_can_read_knowledge_documents"
on public.knowledge_documents for select to authenticated
using (
    exists (
        select 1 from public.projects p
        where p.id = knowledge_documents.project_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_document_chunks"
on public.document_chunks for select to authenticated
using (
    exists (
        select 1 from public.knowledge_documents kd
        join public.projects p on p.id = kd.project_id
        where kd.id = document_chunks.document_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_embeddings"
on public.embeddings for select to authenticated
using (
    exists (
        select 1 from public.document_chunks dc
        join public.knowledge_documents kd on kd.id = dc.document_id
        join public.projects p on p.id = kd.project_id
        where dc.id = embeddings.chunk_id
          and public.is_org_member(p.organization_id)
    )
);


-- =========================================================
-- 11. CONVERSATIONS & MESSAGES POLICIES
-- =========================================================

create policy "members_can_read_conversations"
on public.conversations for select to authenticated
using (
    exists (
        select 1 from public.projects p
        where p.id = conversations.project_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_create_conversations"
on public.conversations for insert to authenticated
with check (
    user_id = auth.uid()
    and exists (
        select 1 from public.projects p
        where p.id = conversations.project_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_messages"
on public.messages for select to authenticated
using (
    exists (
        select 1 from public.conversations c
        join public.projects p on p.id = c.project_id
        where c.id = messages.conversation_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_insert_messages"
on public.messages for insert to authenticated
with check (
    exists (
        select 1 from public.conversations c
        join public.projects p on p.id = c.project_id
        where c.id = messages.conversation_id
          and public.is_org_member(p.organization_id)
    )
);


-- =========================================================
-- 12. AGENT RUNS, STEPS & INGESTION JOBS POLICIES
-- =========================================================

create policy "members_can_read_agent_runs"
on public.agent_runs for select to authenticated
using (
    exists (
        select 1 from public.projects p
        where p.id = agent_runs.project_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_agent_steps"
on public.agent_steps for select to authenticated
using (
    exists (
        select 1 from public.agent_runs ar
        join public.projects p on p.id = ar.project_id
        where ar.id = agent_steps.agent_run_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "members_can_read_ingestion_jobs"
on public.ingestion_jobs for select to authenticated
using (
    exists (
        select 1 from public.repositories r
        join public.projects p on p.id = r.project_id
        where r.id = ingestion_jobs.repository_id
          and public.is_org_member(p.organization_id)
    )
);

create policy "admins_can_read_audit_logs"
on public.audit_logs for select to authenticated
using (
    public.is_org_admin(organization_id)
);