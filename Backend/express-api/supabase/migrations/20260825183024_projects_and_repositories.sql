-- =========================================================
-- Migration 002: Projects & Repositories
-- =========================================================


-- =========================================================
-- 1. PROJECTS
-- A project is a software system managed inside our platform.
-- =========================================================

create table public.projects (
    id uuid primary key
        default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    name text not null,

    slug text not null,

    description text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint projects_organization_slug_unique
        unique (organization_id, slug)
);


-- =========================================================
-- 2. REPOSITORIES
-- A project can contain one or more source-code repositories.
-- =========================================================

create table public.repositories (
    id uuid primary key
        default gen_random_uuid(),

    project_id uuid not null
        references public.projects(id)
        on delete cascade,

    provider text not null,

    external_id text not null,

    owner text not null,

    name text not null,

    full_name text not null,

    default_branch text not null
        default 'main',

    url text not null,

    is_active boolean not null
        default true,

    last_synced_at timestamptz,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint repositories_provider_check
        check (provider in ('github', 'gitlab', 'bitbucket')),

    constraint repositories_provider_external_id_unique
        unique (provider, external_id)
);


-- =========================================================
-- 3. INDEXES
-- =========================================================

create index projects_organization_id_idx
    on public.projects(organization_id);

create index repositories_project_id_idx
    on public.repositories(project_id);

create index repositories_full_name_idx
    on public.repositories(full_name);