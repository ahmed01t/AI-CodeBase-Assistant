-- =========================================================
-- Migration: Identity and Organizations
-- =========================================================

-- =========================================================
-- 1. PROFILES
-- Extends Supabase Auth users with application data.
-- =========================================================

create table public.profiles (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,

    avatar_url text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now()
);


-- =========================================================
-- 2. ORGANIZATIONS
-- A workspace that owns projects and repositories.
-- =========================================================

create table public.organizations (
    id uuid primary key
        default gen_random_uuid(),

    name text not null,

    slug text not null unique,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now()
);


-- =========================================================
-- 3. ORGANIZATION MEMBERS
-- Many-to-many relationship between users and organizations.
-- =========================================================

create table public.organization_members (
    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    role text not null,

    joined_at timestamptz not null
        default now(),

    primary key (organization_id, user_id),

    constraint organization_members_role_check
        check (role in ('owner', 'admin', 'member', 'viewer'))
);