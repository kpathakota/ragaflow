-- Ragams: melodic frameworks (publicly readable)
create table ragams (
  id text primary key,
  name text not null,
  description text not null default '',
  tradition text not null default 'carnatic'
    check (tradition in ('carnatic', 'hindustani', 'both')),
  time_of_day text
);

alter table ragams enable row level security;

create policy "ragams are publicly readable"
  on ragams for select
  to anon, authenticated
  using (true);

-- Tracks: recorded sessions (publicly readable)
create table tracks (
  id text primary key,
  title text not null,
  ragam_id text not null references ragams(id),
  scenarios text[] not null default '{}',
  tags text[] not null default '{}',
  description text not null default '',
  duration integer not null default 0,
  audio_url text not null,
  download_url text,
  free boolean not null default true,
  created_at timestamptz not null default now()
);

alter table tracks enable row level security;

create policy "tracks are publicly readable"
  on tracks for select
  to anon, authenticated
  using (true);

-- Rasika preferences: favorites and defaults (owner only)
create table rasika_preferences (
  id uuid primary key default gen_random_uuid(),
  rasika_id uuid not null references auth.users(id) on delete cascade unique,
  favorite_tracks text[] not null default '{}',
  favorite_ragams text[] not null default '{}',
  default_focus_track text references tracks(id),
  default_sleep_track text references tracks(id),
  default_meditate_track text references tracks(id)
);

alter table rasika_preferences enable row level security;

create policy "rasikas manage own preferences"
  on rasika_preferences for all
  to authenticated
  using (auth.uid() = rasika_id)
  with check (auth.uid() = rasika_id);

-- Listening sessions: per-play logs (owner only)
create table listening_sessions (
  id uuid primary key default gen_random_uuid(),
  rasika_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null references tracks(id),
  scenario text not null check (scenario in ('focus', 'sleep', 'meditate')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0
);

alter table listening_sessions enable row level security;

create policy "rasikas manage own sessions"
  on listening_sessions for all
  to authenticated
  using (auth.uid() = rasika_id)
  with check (auth.uid() = rasika_id);

-- Certifications: per-ragam achievement levels (owner only)
create table certifications (
  id uuid primary key default gen_random_uuid(),
  rasika_id uuid not null references auth.users(id) on delete cascade,
  ragam_id text not null references ragams(id),
  level integer not null default 1 check (level between 1 and 4),
  total_seconds integer not null default 0,
  unique (rasika_id, ragam_id)
);

alter table certifications enable row level security;

create policy "rasikas manage own certifications"
  on certifications for all
  to authenticated
  using (auth.uid() = rasika_id)
  with check (auth.uid() = rasika_id);
