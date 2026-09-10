begin;

-- Table for modular feature / service cards
create table public.site_cards (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 300),
  icon_key text not null check (char_length(btrim(icon_key)) between 1 and 40),
  badge text check (badge is null or char_length(btrim(badge)) between 1 and 40),
  link_url text check (link_url is null or (char_length(btrim(link_url)) between 1 and 256 and link_url ~ '^(https?://|/|mailto:|tel:|#).*')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_cards_site_sort_idx on public.site_cards (site_id, sort_order);

-- Table for promotional discounts and special offers
create table public.site_promotions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null check (char_length(btrim(description)) between 1 and 400),
  discount_label text check (discount_label is null or char_length(btrim(discount_label)) between 1 and 30),
  coupon_code text check (coupon_code is null or char_length(btrim(coupon_code)) between 1 and 30),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index site_promotions_site_idx on public.site_promotions (site_id, is_active);

-- Table for contact channels (WhatsApp, phone, email, socials)
create table public.site_contacts (
  site_id uuid primary key references public.sites(id) on delete cascade,
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_message text check (whatsapp_message is null or char_length(btrim(whatsapp_message)) between 1 and 140),
  instagram_handle text check (instagram_handle is null or instagram_handle ~ '^[a-zA-Z0-9._]{1,30}$'),
  facebook_url text check (facebook_url is null or (char_length(btrim(facebook_url)) between 1 and 256 and facebook_url ~ '^https?://.*')),
  email text check (email is null or (char_length(btrim(email)) between 3 and 254 and email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')),
  phone text check (phone is null or char_length(btrim(phone)) between 3 and 30),
  updated_at timestamptz not null default now()
);

-- Force RLS on all content tables
alter table public.site_cards enable row level security;
alter table public.site_cards force row level security;
alter table public.site_promotions enable row level security;
alter table public.site_promotions force row level security;
alter table public.site_contacts enable row level security;
alter table public.site_contacts force row level security;

revoke all on table public.site_cards, public.site_promotions, public.site_contacts from public, anon, authenticated;
grant select, insert, update, delete on table public.site_cards, public.site_promotions, public.site_contacts to authenticated;

-- Policies for site_cards
create policy site_cards_select_member on public.site_cards
  for select to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_cards.site_id
        and public.current_user_tenant_role(s.tenant_id) is not null
    )
  );

create policy site_cards_insert_editor on public.site_cards
  for insert to authenticated with check (
    exists (
      select 1 from public.sites s
      where s.id = site_cards.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_cards_update_editor on public.site_cards
  for update to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_cards.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  ) with check (
    exists (
      select 1 from public.sites s
      where s.id = site_cards.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_cards_delete_editor on public.site_cards
  for delete to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_cards.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

-- Policies for site_promotions
create policy site_promotions_select_member on public.site_promotions
  for select to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_promotions.site_id
        and public.current_user_tenant_role(s.tenant_id) is not null
    )
  );

create policy site_promotions_insert_editor on public.site_promotions
  for insert to authenticated with check (
    exists (
      select 1 from public.sites s
      where s.id = site_promotions.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_promotions_update_editor on public.site_promotions
  for update to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_promotions.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  ) with check (
    exists (
      select 1 from public.sites s
      where s.id = site_promotions.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_promotions_delete_editor on public.site_promotions
  for delete to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_promotions.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

-- Policies for site_contacts
create policy site_contacts_select_member on public.site_contacts
  for select to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_contacts.site_id
        and public.current_user_tenant_role(s.tenant_id) is not null
    )
  );

create policy site_contacts_insert_editor on public.site_contacts
  for insert to authenticated with check (
    exists (
      select 1 from public.sites s
      where s.id = site_contacts.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_contacts_update_editor on public.site_contacts
  for update to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_contacts.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  ) with check (
    exists (
      select 1 from public.sites s
      where s.id = site_contacts.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_contacts_delete_editor on public.site_contacts
  for delete to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_contacts.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

commit;
