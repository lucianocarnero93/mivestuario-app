alter table "user" add column if not exists "menor" boolean not null default false;
alter table "user" add column if not exists "edadConfirmada" boolean not null default false;
alter table "user" add column if not exists "adultoAvisado" boolean not null default false;
