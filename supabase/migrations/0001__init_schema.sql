-- GridWork: full schema DDL
-- Run via Supabase Dashboard SQL Editor or: supabase db push
-- Tables: profiles, boards, board_members, projects, sub_projects, sub_project_members, activities

create extension if not exists "pgcrypto";

-- ─── updated_at trigger function ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  name          text        not null,
  name_th       text        not null default '',
  role          text        not null default 'editor'
                            check (role in ('admin', 'editor', 'viewer')),
  status        text        not null default 'active'
                            check (status in ('active', 'invited', 'suspended')),
  suspended_at  timestamptz null,
  color         text        not null default '#7C5CFF',
  initials      text        not null default '',
  last_active_at timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- case-insensitive email uniqueness
create unique index if not exists profiles_email_lower_idx on profiles (lower(email));
create index if not exists profiles_role_idx    on profiles (role);
create index if not exists profiles_status_idx  on profiles (status);

alter table profiles enable row level security;

-- A user can see their own profile + profiles of co-members on any shared board
create policy "profiles_select_own_or_co_member"
  on profiles for select
  using (
    id = auth.uid()
    or id in (
      select bm2.user_id
      from   board_members bm1
      join   board_members bm2 on bm1.board_id = bm2.board_id
      where  bm1.user_id = auth.uid()
    )
  );

-- Mutations are service-role only (API enforces all writes)

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ─── boards ───────────────────────────────────────────────────────────────────
create table if not exists boards (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  name_th     text        null,
  icon        text        not null default '▦',
  color       text        not null default '#7C5CFF',
  owner_id    uuid        not null references profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists boards_owner_id_idx on boards (owner_id);

alter table boards enable row level security;

-- A user can see boards they are a member of
create policy "boards_select_if_member"
  on boards for select
  using (
    id in (
      select board_id from board_members where user_id = auth.uid()
    )
  );

create trigger trg_boards_updated_at
  before update on boards
  for each row execute function update_updated_at();

-- ─── board_members ────────────────────────────────────────────────────────────
create table if not exists board_members (
  board_id  uuid        not null references boards(id)    on delete cascade,
  user_id   uuid        not null references profiles(id)  on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index if not exists board_members_user_id_idx on board_members (user_id);

alter table board_members enable row level security;

-- A user can see board_members rows for boards they belong to
create policy "board_members_select_self_or_co_member"
  on board_members for select
  using (
    user_id = auth.uid()
    or board_id in (
      select board_id from board_members where user_id = auth.uid()
    )
  );

-- ─── projects ─────────────────────────────────────────────────────────────────
create table if not exists projects (
  id          uuid        primary key default gen_random_uuid(),
  board_id    uuid        not null references boards(id)   on delete cascade,
  name        text        not null,
  name_th     text        null,
  icon        text        not null default '◇',
  color       text        not null default '#7C5CFF',
  type        text        not null default 'ad_hoc'
                          check (type in ('year_plan', 'ad_hoc')),
  position    integer     not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_board_id_position_idx on projects (board_id, position);

alter table projects enable row level security;

create policy "projects_select_if_board_member"
  on projects for select
  using (
    board_id in (
      select board_id from board_members where user_id = auth.uid()
    )
  );

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- ─── sub_projects ─────────────────────────────────────────────────────────────
create table if not exists sub_projects (
  id                   uuid        primary key default gen_random_uuid(),
  project_id           uuid        not null references projects(id) on delete cascade,
  name                 text        not null,
  name_th              text        null,
  icon                 text        not null default '◇',
  lead_id              uuid        null     references profiles(id) on delete set null,
  status               text        not null default 'requirement'
                                   check (status in ('requirement','spec','dev','test','uat','go_live')),
  priority             text        not null default 'p3'
                                   check (priority in ('p1','p2','p3','p4')),
  due                  date        null,
  progress             integer     not null default 0 check (progress between 0 and 100),
  progress_prev        integer     null     check (progress_prev between 0 and 100),
  progress_updated_at  timestamptz null,
  quarter              text        null,
  tags                 text[]      not null default '{}',
  position             integer     not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists sub_projects_project_id_position_idx on sub_projects (project_id, position);
create index if not exists sub_projects_lead_id_idx             on sub_projects (lead_id);
create index if not exists sub_projects_status_idx              on sub_projects (status);
create index if not exists sub_projects_due_idx                 on sub_projects (due) where due is not null;

alter table sub_projects enable row level security;

-- Realtime-ready: gated per-board via projects join
create policy "sub_projects_select_if_board_member"
  on sub_projects for select
  using (
    project_id in (
      select p.id
      from   projects p
      join   board_members bm on bm.board_id = p.board_id
      where  bm.user_id = auth.uid()
    )
  );

create trigger trg_sub_projects_updated_at
  before update on sub_projects
  for each row execute function update_updated_at();

-- ─── sub_project_members ──────────────────────────────────────────────────────
create table if not exists sub_project_members (
  sub_project_id  uuid        not null references sub_projects(id) on delete cascade,
  user_id         uuid        not null references profiles(id)      on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (sub_project_id, user_id)
);

create index if not exists sub_project_members_user_id_idx on sub_project_members (user_id);

alter table sub_project_members enable row level security;

create policy "sub_project_members_select_if_board_member"
  on sub_project_members for select
  using (
    sub_project_id in (
      select sp.id
      from   sub_projects sp
      join   projects p     on p.id = sp.project_id
      join   board_members bm on bm.board_id = p.board_id
      where  bm.user_id = auth.uid()
    )
  );

-- ─── activities ───────────────────────────────────────────────────────────────
create table if not exists activities (
  id              uuid        primary key default gen_random_uuid(),
  sub_project_id  uuid        not null references sub_projects(id) on delete cascade,
  author_id       uuid        null     references profiles(id)      on delete set null,
  type            text        not null
                              check (type in ('meeting','milestone','progress','note','block')),
  title           text        not null,
  body            text        null,
  occurs_at       timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists activities_sub_project_id_occurs_at_idx on activities (sub_project_id, occurs_at);
create index if not exists activities_author_id_idx                 on activities (author_id);
create index if not exists activities_occurs_at_idx                 on activities (occurs_at);

alter table activities enable row level security;

create policy "activities_select_if_board_member"
  on activities for select
  using (
    sub_project_id in (
      select sp.id
      from   sub_projects sp
      join   projects p       on p.id = sp.project_id
      join   board_members bm on bm.board_id = p.board_id
      where  bm.user_id = auth.uid()
    )
  );

create trigger trg_activities_updated_at
  before update on activities
  for each row execute function update_updated_at();
