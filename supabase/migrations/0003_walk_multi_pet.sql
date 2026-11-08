-- Permite que un paseo incluya varias mascotas a la vez (paseo conjunto):
-- `pet_id` pasa a ser `pet_ids` (array). Se conserva `pet_id` sin usar por
-- si hiciera falta consultarlo durante la migración manual de datos
-- antiguos; el cliente ya no lo lee ni lo escribe.
alter table public.walks
  add column if not exists pet_ids text[];

update public.walks
  set pet_ids = array[pet_id]
  where pet_ids is null and pet_id is not null;

create index if not exists walks_pet_ids_idx
  on public.walks using gin (pet_ids);
