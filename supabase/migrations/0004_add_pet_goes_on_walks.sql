-- Indica si la mascota sale de paseo. Por defecto true (coherente con
-- `Pet.goesOnWalks ?? true` en el dominio): perros y "otro" siempre pasean,
-- y en gatos se pregunta explícitamente al crear el perfil porque muchos no
-- salen nunca.
alter table public.pets
  add column if not exists goes_on_walks boolean not null default true;

comment on column public.pets.goes_on_walks is
  'Si la mascota participa en paseos (siempre true salvo que se desmarque al crear un gato)';
