-- thanksben Ad Studio — tables. Applied at runtime by lib/db.ts:ensureSchema()
-- on the first query of each server process. Every statement is idempotent.
-- Prefix `tb_` so this can share a Postgres instance with other apps.

-- The matched-social-proof library: existing customers, tagged.
-- Seeded from data/clients.json by POST /api/seed. See data/SCHEMA.md.
create table if not exists tb_clients (
  id             bigserial primary key,
  name           text not null,
  domain         text unique not null,
  logo_url       text,
  practice_areas text[] default '{}',   -- the taxonomy axis matched ×3 (see lib/match.ts)
  industries     text[] default '{}',   -- client sectors served, matched ×2
  geo_country    text,
  geo_region     text,                  -- must be one of market.regions in lib/brand.ts
  tier           text,
  source_url     text,
  created_at     timestamptz default now()
);

-- One row per research + generation session ("conversation" in the sidebar).
create table if not exists tb_generations (
  id          uuid primary key default gen_random_uuid(),
  firm_url    text not null,
  firm_name   text,
  firm_domain text,
  location    text,
  specialties jsonb default '[]',   -- [{name, industries, blurb}]
  summary     text,
  landing     jsonb,                -- tailored landing-page copy + logos
  created_at  timestamptz default now()
);

-- Each generated ad (one per selected market).
create table if not exists tb_ads (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid references tb_generations(id) on delete cascade,
  specialty     text,
  headline      text,
  subhead       text,
  image_key     text,               -- object-storage key; bytes served via /api/ads/[id]
  logos         jsonb default '[]',  -- [{name, logoUrl}]
  created_at    timestamptz default now()
);

create index if not exists tb_ads_gen_idx on tb_ads(generation_id);
create index if not exists tb_generations_created_idx on tb_generations(created_at desc);

-- Kept for instances created before these columns were part of the creates above.
alter table tb_generations add column if not exists landing jsonb;
alter table tb_ads add column if not exists image_key text;
