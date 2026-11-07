-- =========================================================
-- PetTracker — esquema inicial Supabase (Postgres)
-- =========================================================

-- Función reutilizable para mantener updated_at al día
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- pets
-- ---------------------------------------------------------
create table public.pets (
  id            text primary key,                 -- mismo id que genera el cliente
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  breed         text,
  age           integer,
  avatar_uri    text,                              -- v1: ruta/uri local o remota como texto plano
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_pets_user_id on public.pets(user_id);

create trigger trg_pets_updated_at
  before update on public.pets
  for each row execute function set_updated_at();

alter table public.pets enable row level security;

create policy "pets_select_own" on public.pets
  for select using (auth.uid() = user_id);
create policy "pets_insert_own" on public.pets
  for insert with check (auth.uid() = user_id);
create policy "pets_update_own" on public.pets
  for update using (auth.uid() = user_id);
create policy "pets_delete_own" on public.pets
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- walks
-- ---------------------------------------------------------
create table public.walks (
  id               text primary key,
  pet_id           text not null references public.pets(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  start_time       timestamptz not null,
  end_time         timestamptz,
  distance_meters  double precision not null default 0,
  route            jsonb not null default '[]',    -- [{ "latitude": .., "longitude": .. }, ...]
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index idx_walks_pet_id on public.walks(pet_id);
create index idx_walks_user_id on public.walks(user_id);
create index idx_walks_start_time on public.walks(start_time);

create trigger trg_walks_updated_at
  before update on public.walks
  for each row execute function set_updated_at();

alter table public.walks enable row level security;

create policy "walks_select_own" on public.walks
  for select using (auth.uid() = user_id);
create policy "walks_insert_own" on public.walks
  for insert with check (auth.uid() = user_id);
create policy "walks_update_own" on public.walks
  for update using (auth.uid() = user_id);
create policy "walks_delete_own" on public.walks
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- droppings
-- ---------------------------------------------------------
create table public.droppings (
  id            text primary key,
  pet_id        text not null references public.pets(id) on delete cascade,
  walk_id       text references public.walks(id) on delete set null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  latitude      double precision,
  longitude     double precision,
  consistency   text not null default 'normal'
                  check (consistency in ('hard', 'normal', 'soft', 'diarrhea')),
  color         text,
  notes         text,
  photo_url     text,
  occurred_at   timestamptz not null,               -- mapea a Dropping.timestamp
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_droppings_pet_id on public.droppings(pet_id);
create index idx_droppings_user_id on public.droppings(user_id);
create index idx_droppings_occurred_at on public.droppings(occurred_at);
create index idx_droppings_walk_id on public.droppings(walk_id);

create trigger trg_droppings_updated_at
  before update on public.droppings
  for each row execute function set_updated_at();

alter table public.droppings enable row level security;

create policy "droppings_select_own" on public.droppings
  for select using (auth.uid() = user_id);
create policy "droppings_insert_own" on public.droppings
  for insert with check (auth.uid() = user_id);
create policy "droppings_update_own" on public.droppings
  for update using (auth.uid() = user_id);
create policy "droppings_delete_own" on public.droppings
  for delete using (auth.uid() = user_id);
