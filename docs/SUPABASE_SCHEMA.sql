create table if not exists entries (
  id uuid primary key,
  text text not null,
  source text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analysis_version text
);

create table if not exists attachments (
  id uuid primary key,
  entry_id uuid references entries(id) on delete cascade,
  type text,
  name text,
  mime_type text,
  size integer,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists entry_analyses (
  id uuid primary key,
  entry_id uuid references entries(id) on delete cascade,
  analyzer text,
  version text,
  summary text,
  detected_pain jsonb,
  detected_needs jsonb,
  categories jsonb,
  repeatability_guess text,
  suggested_timing text,
  opportunities jsonb,
  privacy_risk text,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists weekly_insights (
  id uuid primary key,
  week_start date,
  week_end date,
  title text,
  summary text,
  suggested_action text,
  source_entry_ids jsonb,
  opportunities jsonb,
  created_at timestamptz not null default now()
);

create table if not exists developer_notes (
  id uuid primary key,
  source_entry_id uuid references entries(id) on delete cascade,
  raw_text text,
  interpreted_issue text,
  user_pain text,
  desired_experience text,
  suggested_fix text,
  acceptance_criteria jsonb,
  one_question_to_ask text,
  codex_spec text,
  created_at timestamptz not null default now()
);

-- v0.4 policy:
-- Browsers do not read or write these tables directly.
-- Next.js Route Handlers use SUPABASE_SERVICE_ROLE_KEY on the server.
-- RLS is enabled with no anon/auth policies so public clients cannot access data directly.
alter table entries enable row level security;
alter table attachments enable row level security;
alter table entry_analyses enable row level security;
alter table weekly_insights enable row level security;
alter table developer_notes enable row level security;
