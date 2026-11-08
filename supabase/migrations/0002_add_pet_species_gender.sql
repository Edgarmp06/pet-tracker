-- Añade especie y género a `pets`, usados por el formulario de
-- creación/edición de mascotas (selección visual de especie/género).
alter table public.pets
  add column if not exists species text,
  add column if not exists gender text;

comment on column public.pets.species is 'dog | cat | other';
comment on column public.pets.gender is 'male | female';
