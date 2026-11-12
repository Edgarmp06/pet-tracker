-- =========================================================
-- PetTracker — historial de peso de la mascota
-- =========================================================

create table public.pet_weights (
  id            text primary key,
  pet_id        text not null references public.pets(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  weight_kg     double precision not null check (weight_kg > 0),
  notes         text,
  occurred_at   timestamptz not null,               -- mapea a WeightEntry.timestamp
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_pet_weights_pet_id on public.pet_weights(pet_id);
create index idx_pet_weights_user_id on public.pet_weights(user_id);
create index idx_pet_weights_occurred_at on public.pet_weights(occurred_at);

create trigger trg_pet_weights_updated_at
  before update on public.pet_weights
  for each row execute function set_updated_at();

alter table public.pet_weights enable row level security;

create policy "pet_weights_select_own" on public.pet_weights
  for select using (auth.uid() = user_id);
create policy "pet_weights_insert_own" on public.pet_weights
  for insert with check (auth.uid() = user_id);
create policy "pet_weights_update_own" on public.pet_weights
  for update using (auth.uid() = user_id);
create policy "pet_weights_delete_own" on public.pet_weights
  for delete using (auth.uid() = user_id);
