begin;

-- Table for platform-wide design color palettes
create table if not exists public.platform_palettes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 64),
  description text check (description is null or char_length(description) <= 256),
  primary_color text not null check (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text not null check (secondary_color ~* '^#[0-9a-f]{6}$'),
  accent_color text not null check (accent_color ~* '^#[0-9a-f]{6}$'),
  background_color text not null check (background_color ~* '^#[0-9a-f]{6}$'),
  text_color text not null check (text_color ~* '^#[0-9a-f]{6}$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.platform_palettes enable row level security;
alter table public.platform_palettes force row level security;

revoke all on table public.platform_palettes from public, anon, authenticated;
grant select on table public.platform_palettes to anon, authenticated;
grant insert, update, delete on table public.platform_palettes to authenticated;

-- Everyone can read palettes so sites, clients, and previews can use them
create policy platform_palettes_select on public.platform_palettes
  for select to authenticated, anon
  using (true);

-- Only platform superadmins can insert, update, or delete palettes
create policy platform_palettes_insert on public.platform_palettes
  for insert to authenticated
  with check (public.is_platform_superadmin());

create policy platform_palettes_update on public.platform_palettes
  for update to authenticated
  using (public.is_platform_superadmin())
  with check (public.is_platform_superadmin());

create policy platform_palettes_delete on public.platform_palettes
  for delete to authenticated
  using (public.is_platform_superadmin() and is_system = false);

-- Seed curated system palettes
insert into public.platform_palettes (name, description, primary_color, secondary_color, accent_color, background_color, text_color, is_system)
values
  ('Cyber Neon', 'Paleta futurista de alto contraste con acentos neón y violeta.', '#06b6d4', '#8b5cf6', '#ec4899', '#090d16', '#f8fafc', true),
  ('Tech Indigo', 'Azul cobalto e índigo para soluciones SaaS y corporativas.', '#4f46e5', '#06b6d4', '#f59e0b', '#0b0f19', '#f9fafb', true),
  ('Emerald Trust', 'Tonos esmeralda y menta orientados a finanzas, salud y confianza.', '#059669', '#10b981', '#34d399', '#04130d', '#f0fdf4', true),
  ('Amber Industrial', 'Ámbar técnico y amarillo industrial para servicios y logística.', '#d97706', '#f59e0b', '#fbbf24', '#120e07', '#fffbeb', true),
  ('Crimson Editorial', 'Rojo carmesí de alta gama para agencias boutique y consultoría.', '#e11d48', '#be123c', '#fb7185', '#140508', '#fff1f2', true),
  ('Nordic Slate', 'Pizarra sobria y minimalismo nórdico de máxima legibilidad.', '#475569', '#64748b', '#38bdf8', '#0b1120', '#f8fafc', true)
on conflict do nothing;

commit;
