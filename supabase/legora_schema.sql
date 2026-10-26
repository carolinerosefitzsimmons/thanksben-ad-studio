-- Legora Ad Generator — tables (live in the same Supabase project as vendor-radar; prefixed to avoid clashes).

-- The matched-social-proof logo library (Legora's customers, tagged).
create table if not exists legora_clients (
  id            bigserial primary key,
  name          text not null,
  domain        text unique not null,
  logo_url      text,
  practice_areas text[] default '{}',
  industries    text[] default '{}',
  geo_country   text,
  geo_region    text,
  tier          text,
  source_url    text,
  created_at    timestamptz default now()
);

-- One row per firm research + ad-generation session ("conversation" in the sidebar).
create table if not exists lag_generations (
  id          uuid primary key default gen_random_uuid(),
  firm_url    text not null,
  firm_name   text,
  firm_domain text,
  location    text,
  specialties jsonb default '[]',   -- [{name, industries, blurb}]
  summary     text,
  created_at  timestamptz default now()
);

-- Each generated ad (one per chosen specialty).
create table if not exists lag_ads (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid references lag_generations(id) on delete cascade,
  specialty     text,
  headline      text,
  subhead       text,
  image_base64  text,              -- PNG, base64 (served as data URI; avoids needing storage keys)
  logos         jsonb default '[]', -- [{name, logoUrl}]
  created_at    timestamptz default now()
);

create index if not exists lag_ads_gen_idx on lag_ads(generation_id);
create index if not exists lag_generations_created_idx on lag_generations(created_at desc);

-- Tailored landing-page content (copy + social-proof logos), generated once per firm.
alter table lag_generations add column if not exists landing jsonb;
