-- =====================================================================
-- CRM Vertian Solutions — esquema inicial de la base de datos
-- =====================================================================
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este
-- archivo → Run. Solo hay que hacerlo una vez.
--
-- Qué crea:
--   lineas_negocio      Las 3 líneas de la empresa (afiliados, energía, IA)
--   perfiles            Datos y rol (admin/empleado) de cada usuario
--   clientes            Fichas de cliente
--   interacciones       Histórico de llamadas, emails, reuniones… por cliente
--   oportunidades       Pipeline de ventas (kanban)
--   servicios           Catálogo de conceptos facturables por línea
--   conceptos_cliente   Lo que hay que facturar a cada cliente
--   facturas            Facturas enviadas a Holded (con su ID en Holded)
--   factura_lineas      Líneas de cada factura (copia de lo facturado)
--
-- Además activa la "seguridad a nivel de fila" (RLS): la propia base de
-- datos impide que un empleado vea clientes que no son suyos, aunque
-- alguien manipulara la aplicación.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos (listas cerradas de valores)
-- ---------------------------------------------------------------------
create type public.rol_usuario      as enum ('admin', 'empleado');
create type public.estado_cliente   as enum ('lead', 'negociacion', 'activo', 'inactivo');
create type public.etapa_oportunidad as enum ('nuevo', 'contactado', 'propuesta', 'ganado', 'perdido');
create type public.tipo_interaccion as enum ('nota', 'llamada', 'email', 'reunion', 'whatsapp', 'otro');
create type public.estado_sync      as enum ('pendiente', 'sincronizado', 'error');
create type public.estado_factura   as enum ('pendiente_envio', 'emitida', 'pagada', 'parcial', 'anulada', 'error');


-- ---------------------------------------------------------------------
-- Función auxiliar: rellena updated_at automáticamente al modificar
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ---------------------------------------------------------------------
-- Líneas de negocio
-- ---------------------------------------------------------------------
create table public.lineas_negocio (
  id          smallint generated always as identity primary key,
  slug        text not null unique,
  nombre      text not null,
  color       text not null default '#64748b',
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.lineas_negocio (slug, nombre, color) values
  ('afiliados',        'Marketing de afiliados',          '#f59e0b'),
  ('certificaciones',  'Certificaciones energéticas',     '#10b981'),
  ('ia-saas',          'Automatizaciones IA / SaaS',      '#6366f1');


-- ---------------------------------------------------------------------
-- Perfiles de usuario (1 por cada usuario de Supabase Auth)
-- ---------------------------------------------------------------------
create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nombre      text not null default '',
  rol         public.rol_usuario not null default 'empleado',
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function public.tocar_updated_at();

-- Cuando se crea un usuario en Supabase Auth, se le crea su perfil.
-- El rol se lee de app_metadata, que SOLO puede escribir el servidor
-- (nunca el propio usuario), así nadie puede auto-asignarse "admin".
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, 'empleado')
  );
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ¿El usuario que hace la petición es admin (y está activo)?
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin' and activo
  );
$$;

-- ¿El usuario que hace la petición está activo? (los dados de baja no ven nada)
create or replace function public.es_usuario_activo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and activo
  );
$$;


-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table public.clientes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,                 -- persona de contacto o nombre comercial
  razon_social       text,                          -- nombre fiscal (para facturar)
  nif                text,                          -- NIF/CIF
  email              text,
  telefono           text,
  direccion          text,
  codigo_postal      text,
  ciudad             text,
  provincia          text,
  pais               text not null default 'ES',
  linea_negocio_id   smallint not null references public.lineas_negocio (id),
  estado             public.estado_cliente not null default 'lead',
  responsable_id     uuid references public.perfiles (id) on delete set null,
  notas              text,
  -- Sincronización con Holded
  holded_contact_id  text unique,
  holded_sync_estado public.estado_sync not null default 'pendiente',
  holded_sync_error  text,
  holded_sync_at     timestamptz,
  created_by         uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index clientes_linea_idx       on public.clientes (linea_negocio_id);
create index clientes_estado_idx      on public.clientes (estado);
create index clientes_responsable_idx on public.clientes (responsable_id);

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();

-- ¿Puede el usuario actual ver/editar este cliente? (admin o responsable)
create or replace function public.puede_ver_cliente(p_cliente_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.es_admin() or exists (
    select 1 from public.clientes c
    where c.id = p_cliente_id
      and c.responsable_id = auth.uid()
      and public.es_usuario_activo()
  );
$$;


-- ---------------------------------------------------------------------
-- Histórico de interacciones con un cliente
-- ---------------------------------------------------------------------
create table public.interacciones (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  autor_id    uuid references public.perfiles (id) on delete set null default auth.uid(),
  tipo        public.tipo_interaccion not null default 'nota',
  descripcion text not null,
  fecha       timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index interacciones_cliente_idx on public.interacciones (cliente_id, fecha desc);


-- ---------------------------------------------------------------------
-- Oportunidades (pipeline kanban)
-- ---------------------------------------------------------------------
create table public.oportunidades (
  id                     uuid primary key default gen_random_uuid(),
  titulo                 text not null,
  cliente_id             uuid not null references public.clientes (id) on delete cascade,
  linea_negocio_id       smallint not null references public.lineas_negocio (id),
  etapa                  public.etapa_oportunidad not null default 'nuevo',
  responsable_id         uuid references public.perfiles (id) on delete set null,
  importe_estimado       numeric(12, 2) not null default 0,
  fecha_cierre_prevista  date,
  motivo_perdida         text,
  notas                  text,
  posicion               integer not null default 0,   -- orden dentro de la columna
  cerrada_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index oportunidades_etapa_idx       on public.oportunidades (etapa, posicion);
create index oportunidades_responsable_idx on public.oportunidades (responsable_id);
create index oportunidades_cliente_idx     on public.oportunidades (cliente_id);

create trigger oportunidades_updated_at before update on public.oportunidades
  for each row execute function public.tocar_updated_at();


-- ---------------------------------------------------------------------
-- Catálogo de servicios (conceptos facturables reutilizables)
-- ---------------------------------------------------------------------
create table public.servicios (
  id                uuid primary key default gen_random_uuid(),
  linea_negocio_id  smallint not null references public.lineas_negocio (id),
  nombre            text not null,
  descripcion       text,
  precio            numeric(12, 2) not null default 0,   -- sin IVA
  iva               numeric(5, 2) not null default 21,   -- %
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger servicios_updated_at before update on public.servicios
  for each row execute function public.tocar_updated_at();


-- ---------------------------------------------------------------------
-- Conceptos a facturar a cada cliente
-- (se usan para generar la factura en Holded al pasar a "activo"
--  o cuando se pulsa "Facturar" a mano)
-- ---------------------------------------------------------------------
create table public.conceptos_cliente (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes (id) on delete cascade,
  servicio_id      uuid references public.servicios (id) on delete set null,
  descripcion      text not null,
  cantidad         numeric(12, 2) not null default 1,
  precio_unitario  numeric(12, 2) not null default 0,   -- sin IVA
  iva              numeric(5, 2) not null default 21,   -- %
  facturado        boolean not null default false,
  created_at       timestamptz not null default now()
);

create index conceptos_cliente_idx on public.conceptos_cliente (cliente_id);


-- ---------------------------------------------------------------------
-- Facturas (el CRM solo guarda la referencia; la factura "real" vive en Holded)
-- ---------------------------------------------------------------------
create table public.facturas (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes (id) on delete restrict,
  holded_invoice_id   text unique,
  holded_doc_number   text,                      -- número de factura que asigna Holded
  fecha               date not null default current_date,
  subtotal            numeric(12, 2) not null default 0,
  impuestos           numeric(12, 2) not null default 0,
  total               numeric(12, 2) not null default 0,
  importe_pagado      numeric(12, 2) not null default 0,
  estado              public.estado_factura not null default 'pendiente_envio',
  origen              text not null default 'manual' check (origen in ('manual', 'automatica')),
  error               text,
  estado_consultado_at timestamptz,               -- última vez que se preguntó a Holded
  created_by          uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index facturas_cliente_idx on public.facturas (cliente_id, fecha desc);
create index facturas_estado_idx  on public.facturas (estado);

create trigger facturas_updated_at before update on public.facturas
  for each row execute function public.tocar_updated_at();

create table public.factura_lineas (
  id               uuid primary key default gen_random_uuid(),
  factura_id       uuid not null references public.facturas (id) on delete cascade,
  descripcion      text not null,
  cantidad         numeric(12, 2) not null default 1,
  precio_unitario  numeric(12, 2) not null default 0,
  iva              numeric(5, 2) not null default 21
);

create index factura_lineas_factura_idx on public.factura_lineas (factura_id);


-- =====================================================================
-- SEGURIDAD (Row Level Security)
-- Regla general:
--   · Admin: ve y modifica todo.
--   · Empleado: solo lo que tiene asignado como responsable.
--   · Usuario dado de baja (activo = false): no ve nada.
-- =====================================================================
alter table public.lineas_negocio    enable row level security;
alter table public.perfiles          enable row level security;
alter table public.clientes          enable row level security;
alter table public.interacciones     enable row level security;
alter table public.oportunidades     enable row level security;
alter table public.servicios         enable row level security;
alter table public.conceptos_cliente enable row level security;
alter table public.facturas          enable row level security;
alter table public.factura_lineas    enable row level security;

-- Líneas de negocio: todos las leen, solo admin las cambia
create policy "leer lineas" on public.lineas_negocio for select to authenticated
  using (public.es_usuario_activo());
create policy "admin gestiona lineas" on public.lineas_negocio for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Perfiles: todos los activos ven la lista (para elegir responsable),
-- solo admin modifica. Las altas las hace el servidor.
create policy "leer perfiles" on public.perfiles for select to authenticated
  using (public.es_usuario_activo() or id = auth.uid());
create policy "admin modifica perfiles" on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Clientes
create policy "ver clientes" on public.clientes for select to authenticated
  using (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()));
create policy "crear clientes" on public.clientes for insert to authenticated
  with check (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()));
create policy "editar clientes" on public.clientes for update to authenticated
  using (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()))
  with check (public.es_admin() or responsable_id = auth.uid());
create policy "borrar clientes" on public.clientes for delete to authenticated
  using (public.es_admin());

-- Interacciones: quien puede ver el cliente, puede ver y añadir interacciones
create policy "ver interacciones" on public.interacciones for select to authenticated
  using (public.puede_ver_cliente(cliente_id));
create policy "crear interacciones" on public.interacciones for insert to authenticated
  with check (public.puede_ver_cliente(cliente_id));
create policy "editar interacciones" on public.interacciones for update to authenticated
  using (public.es_admin() or autor_id = auth.uid())
  with check (public.puede_ver_cliente(cliente_id));
create policy "borrar interacciones" on public.interacciones for delete to authenticated
  using (public.es_admin() or autor_id = auth.uid());

-- Oportunidades
create policy "ver oportunidades" on public.oportunidades for select to authenticated
  using (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()));
create policy "crear oportunidades" on public.oportunidades for insert to authenticated
  with check (public.es_admin() or (responsable_id = auth.uid() and public.puede_ver_cliente(cliente_id)));
create policy "editar oportunidades" on public.oportunidades for update to authenticated
  using (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()))
  with check (public.es_admin() or responsable_id = auth.uid());
create policy "borrar oportunidades" on public.oportunidades for delete to authenticated
  using (public.es_admin() or (responsable_id = auth.uid() and public.es_usuario_activo()));

-- Servicios: todos leen, admin gestiona
create policy "leer servicios" on public.servicios for select to authenticated
  using (public.es_usuario_activo());
create policy "admin gestiona servicios" on public.servicios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Conceptos del cliente
create policy "gestionar conceptos" on public.conceptos_cliente for all to authenticated
  using (public.puede_ver_cliente(cliente_id)) with check (public.puede_ver_cliente(cliente_id));

-- Facturas: se ven si se ve el cliente. Crear/actualizar lo hace el
-- servidor al hablar con Holded; solo admin puede borrar.
create policy "ver facturas" on public.facturas for select to authenticated
  using (public.puede_ver_cliente(cliente_id));
create policy "crear facturas" on public.facturas for insert to authenticated
  with check (public.puede_ver_cliente(cliente_id));
create policy "editar facturas" on public.facturas for update to authenticated
  using (public.puede_ver_cliente(cliente_id)) with check (public.puede_ver_cliente(cliente_id));
create policy "borrar facturas" on public.facturas for delete to authenticated
  using (public.es_admin());

create policy "ver lineas factura" on public.factura_lineas for select to authenticated
  using (exists (select 1 from public.facturas f where f.id = factura_id and public.puede_ver_cliente(f.cliente_id)));
create policy "crear lineas factura" on public.factura_lineas for insert to authenticated
  with check (exists (select 1 from public.facturas f where f.id = factura_id and public.puede_ver_cliente(f.cliente_id)));
