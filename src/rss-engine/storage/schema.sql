-- Postgres schema for the RSS Engine (reference / production backend).
--
-- The engine ships with an in-memory repository by default (see in-memory.ts).
-- To run against Postgres, apply this DDL and implement the repository
-- interfaces in repositories.ts against your client of choice. The shapes below
-- match the canonical entities in 00_rss_engine_overview.md 1:1.

create extension if not exists "uuid-ossp";

create table if not exists feed_sources (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null,
  original_platform text not null,
  feed_url text not null unique,
  homepage_url text,
  title text,
  query_category text,
  date_category text,
  polling_interval_minutes int not null default 60,
  active boolean not null default true,
  last_polled_at timestamptz,
  last_item_at timestamptz,
  discovered_by_query text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feed_items (
  id uuid primary key default uuid_generate_v4(),
  feed_source_id uuid references feed_sources(id),
  url text not null,
  canonical_url text not null,
  title text not null,
  summary text,
  content_text text,
  author text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  platform text not null,
  tags text[] not null default '{}',
  content_hash text not null,
  external_id text,
  unique(canonical_url),
  unique(content_hash)
);

create index if not exists feed_items_published_at_idx on feed_items (published_at desc);
create index if not exists feed_items_platform_idx on feed_items (platform);

create table if not exists scored_signals (
  item_id uuid primary key references feed_items(id),
  icp_category text not null,
  icp_role text,
  query_category text,
  pain_signal_score numeric not null,
  ai_slop_frustration_score numeric not null,
  authority_score numeric not null,
  visibility_score numeric not null,
  champion_score numeric not null,
  priority_score numeric not null,
  rationale jsonb not null,
  scored_at timestamptz not null default now()
);

create index if not exists scored_signals_priority_idx on scored_signals (priority_score desc);
create index if not exists scored_signals_icp_idx on scored_signals (icp_category);
