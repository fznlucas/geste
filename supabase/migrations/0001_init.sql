-- ============================================================================
-- Geste — initial schema (Supabase / Postgres 15+)
-- 33 tables, Row Level Security on every table, money in integer cents (USD).
-- Conventions: snake_case, uuid primary keys, created_at/updated_at timestamptz.
-- Customers are auth.users (Supabase Auth). Staff = rows in staff_roles.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type staff_role        as enum ('owner', 'support', 'fulfilment', 'content');
create type work_status       as enum ('draft', 'scheduled', 'live', 'archived');
create type guide_level       as enum ('beginner', 'intermediate', 'advanced');
create type order_status      as enum ('pending', 'paid', 'partially_refunded', 'refunded', 'cancelled');
create type item_kind         as enum ('guide', 'print', 'gift_card');
create type fulfilment_status as enum ('not_required', 'to_print', 'printed', 'packed', 'shipped', 'delivered', 'returned');
create type copy_status       as enum ('available', 'reserved', 'sold', 'void');
create type review_status     as enum ('pending', 'published', 'featured', 'hidden');
create type thread_status     as enum ('open', 'done');
create type ai_job_status     as enum ('queued', 'running', 'done', 'failed', 'cancelled');
create type ai_verdict        as enum ('pending', 'approved', 'rejected');
create type promo_kind        as enum ('percent', 'amount');
create type promo_scope       as enum ('guides', 'prints', 'everything');
create type article_status    as enum ('draft', 'published');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  locale        text not null default 'en' check (locale in ('en', 'fr')),
  newsletter    boolean not null default false,
  phone         text,
  default_address jsonb,
  deleted_at    timestamptz,               -- GDPR: scheduled deletion (30 days)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table staff_roles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  role          staff_role not null,
  invited_by    uuid references auth.users (id),
  created_at    timestamptz not null default now()
);

-- Role checks used by RLS. security definer so policies can read staff_roles.
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_roles where user_id = auth.uid());
$$;

create or replace function has_role(r staff_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_roles where user_id = auth.uid() and (role = r or role = 'owner'));
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table works (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,              -- 'N°03'
  slug              text not null unique,              -- 'n03'
  status            work_status not null default 'draft',
  default_format    text not null default '40x50' check (default_format in ('30x40', '40x50', '60x80', '80x100')),  -- card price + level shown in the shop
  publish_at        timestamptz,                       -- for 'scheduled'
  description       text,
  preview_path      text,                              -- storage: public-works/…
  result_photo_path text,                              -- real beginner result
  studio_test_path  text,                              -- Lucas's painted test
  studio_tested     boolean not null default false,
  seo_title         text,
  seo_description   text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table work_formats (
  id               uuid primary key default gen_random_uuid(),
  work_id          uuid not null references works (id) on delete cascade,
  format           text not null check (format in ('30x40', '40x50', '60x80', '80x100')),
  default_level    guide_level not null,
  guide_price_cents int not null check (guide_price_cents > 0),   -- base, level surcharge added by pricing.ts
  est_minutes      int not null,
  active           boolean not null default true,
  unique (work_id, format)
);

create table palettes (
  id              uuid primary key default gen_random_uuid(),
  work_id         uuid not null references works (id) on delete cascade,
  key             text not null,                     -- 'original', 'warm', 'cool', 'earth'
  name            text not null,
  swatches        jsonb not null,                    -- [{hex, name}]
  preview_filter  text,                              -- CSS filter for the preview image
  active          boolean not null default true,
  unique (work_id, key)
);

-- ---------------------------------------------------------------------------
-- Guides (one per work × format × level; palette swaps colour names at render time)
-- ---------------------------------------------------------------------------
create table guides (
  id              uuid primary key default gen_random_uuid(),
  work_id         uuid not null references works (id) on delete cascade,
  format          text not null,
  level           guide_level not null,
  current_version int not null default 0,          -- 0 = never published
  updated_at      timestamptz not null default now(),
  unique (work_id, format, level)
);

create table guide_layers (
  id              uuid primary key default gen_random_uuid(),
  guide_id        uuid not null references guides (id) on delete cascade,
  position        int not null,                      -- 1..n
  name            text not null,                     -- 'Gestures'
  brush           text not null,
  plate           jsonb not null,                    -- [{hex, name}]
  tip             text,
  dry_seconds     int not null default 0,
  diagram         jsonb not null default '[]',       -- DiagramStroke[] (see CanvasDiagram.tsx)
  unique (guide_id, position)
);

create table guide_steps (
  id              uuid primary key default gen_random_uuid(),
  layer_id        uuid not null references guide_layers (id) on delete cascade,
  position        int not null,                      -- 1..5 → a..e
  text            text not null,
  mux_playback_id text,                              -- gesture video (signed playback)
  highlight       jsonb,                             -- strokes to emphasise on the diagram
  unique (layer_id, position)
);

-- Immutable snapshot served to buyers. Editing never touches what buyers see until "Publish".
create table guide_versions (
  id              uuid primary key default gen_random_uuid(),
  guide_id        uuid not null references guides (id) on delete cascade,
  version         int not null,
  content         jsonb not null,                    -- layers + steps, denormalised
  published_by    uuid references auth.users (id),
  published_at    timestamptz not null default now(),
  unique (guide_id, version)
);

create table shopping_items (
  id               uuid primary key default gen_random_uuid(),
  work_id          uuid not null references works (id) on delete cascade,
  position         int not null default 0,
  name             text not null,                    -- 'Turquoise'
  standard_label   text not null,
  budget_label     text not null,
  standard_cents   int not null,
  budget_cents     int not null,
  standard_url     text not null,                    -- affiliate link
  budget_url       text not null,
  quantity_rule    jsonb not null                    -- {"30x40":"20 ml","40x50":"40 ml",…}
);

-- ---------------------------------------------------------------------------
-- Prints
-- ---------------------------------------------------------------------------
create table print_editions (
  id             uuid primary key default gen_random_uuid(),
  work_id        uuid not null references works (id) on delete cascade,
  size           text not null,                      -- 'A3', 'A2', '50×70'
  edition_size   int not null check (edition_size between 1 and 500),
  price_cents    int not null,
  open           boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (work_id, size)
);

create table print_copies (
  id               uuid primary key default gen_random_uuid(),
  edition_id       uuid not null references print_editions (id) on delete cascade,
  number           int not null,                     -- 12 in 12/50
  status           copy_status not null default 'available',
  order_item_id    uuid,                             -- fk added after order_items
  fulfilment       fulfilment_status not null default 'not_required',
  certificate_no   text unique,                      -- 'C-07-012'
  reserved_until   timestamptz,
  unique (edition_id, number)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table carts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  items       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

create sequence order_number_seq start 2000;

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  number                text not null unique default ('GS-' || nextval('order_number_seq')),
  user_id               uuid references auth.users (id) on delete set null,
  email                 text not null,
  status                order_status not null default 'pending',
  currency              text not null default 'usd',
  subtotal_cents        int not null,
  discount_cents        int not null default 0,
  shipping_cents        int not null default 0,
  tax_cents             int not null default 0,
  total_cents           int not null,
  promo_code_id         uuid,
  gift_card_id          uuid,
  gift_card_cents       int not null default 0,
  shipping_address      jsonb,
  stripe_payment_intent text unique,
  stripe_customer       text,
  risk                  text,
  withdrawal_waived     boolean not null default false,   -- EU digital content waiver ticked at checkout
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  kind              item_kind not null,
  work_id           uuid references works (id),
  guide_id          uuid references guides (id),
  edition_id        uuid references print_editions (id),
  config            jsonb not null default '{}',     -- {format, level, palette}
  title             text not null,                   -- 'Guide N°03'
  detail            text,                            -- '60×80 · Intermediate · Original'
  unit_price_cents  int not null,
  quantity          int not null default 1 check (quantity > 0),
  fulfilment        fulfilment_status not null default 'not_required'
);

alter table print_copies add constraint print_copies_order_item_fk foreign key (order_item_id) references order_items (id) on delete set null;

create table refunds (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders (id) on delete cascade,
  amount_cents     int not null check (amount_cents > 0),
  reason           text not null,
  restock          boolean not null default false,
  revoke_access    boolean not null default false,
  stripe_refund_id text unique,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now()
);

create table shipments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  carrier        text not null,                    -- 'colissimo', 'mondial_relay', 'chronopost'
  tracking_no    text,
  label_path     text,                             -- private storage
  parcel         text,                             -- 'Tube 60 cm · 0.4 kg'
  status         text not null default 'label_created',
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
create table entitlements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  guide_id       uuid not null references guides (id),
  order_item_id  uuid references order_items (id) on delete set null,
  palette_key    text not null default 'original',
  prints_left    int not null default 3 check (prints_left >= 0),
  progress       jsonb not null default '{"step":"1a"}',  -- {step, completed_at?}
  opened_at      timestamptz,                             -- first open ends the refund window for guides
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, guide_id, palette_key)
);

create table devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,                                -- 'iPhone · Safari'
  last_seen   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Growth
-- ---------------------------------------------------------------------------
create table promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code = upper(code)),
  kind        promo_kind not null,
  value       int not null check (value > 0),      -- percent (1..100) or cents
  scope       promo_scope not null default 'guides',
  first_order_only boolean not null default false,
  max_uses    int,
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default true,
  note        text,                                -- where it is shared ('TikTok bio')
  created_at  timestamptz not null default now()
);

create table promo_redemptions (
  id            uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes (id) on delete cascade,
  order_id      uuid not null references orders (id) on delete cascade,
  discount_cents int not null,
  created_at    timestamptz not null default now(),
  unique (promo_code_id, order_id)
);

create table gift_cards (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,        -- 'GESTE-4F2K-91AA'
  initial_cents       int not null check (initial_cents > 0),
  balance_cents       int not null check (balance_cents >= 0),
  purchase_order_id   uuid references orders (id),
  sender_name         text,
  recipient_email     text,
  message             text,
  send_at             timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

alter table orders add constraint orders_promo_fk foreign key (promo_code_id) references promo_codes (id);
alter table orders add constraint orders_gift_fk foreign key (gift_card_id) references gift_cards (id);

create table newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  locale        text not null default 'en',
  confirmed_at  timestamptz,                       -- double opt-in
  unsubscribed_at timestamptz,
  source        text,                              -- 'footer', 'checkout'
  created_at    timestamptz not null default now()
);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  body_md       text not null,
  audience      text not null default 'all',       -- 'all', 'buyers', 'never_bought'
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  stats         jsonb not null default '{}',       -- {sent, opened, clicked}
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------------
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  work_id     uuid not null references works (id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  body        text,
  photo_path  text,                                -- result photo (private until published)
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now()
);

create table support_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  email       text not null,
  subject     text not null,
  order_id    uuid references orders (id) on delete set null,
  status      thread_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references support_threads (id) on delete cascade,
  from_staff  boolean not null,
  author_id   uuid references auth.users (id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  locale        text not null default 'en',
  title         text not null,
  category      text not null,                     -- 'Method', 'Stories', 'Studio'
  body_md       text not null,
  cover_path    text,
  status        article_status not null default 'draft',
  published_at  timestamptz,
  views         int not null default 0,
  unique (slug, locale)
);

create table site_settings (
  key         text primary key,                    -- 'home.hero_work', 'support.saved_replies', 'ai.monthly_budget_cents'
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table legal_documents (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,                     -- 'notice', 'terms', 'privacy', 'cookies', 'accessibility'
  locale        text not null default 'en',
  version       int not null,
  body_md       text not null,
  published_at  timestamptz,
  unique (kind, locale, version)
);

-- ---------------------------------------------------------------------------
-- AI pipeline
-- ---------------------------------------------------------------------------
create table ai_jobs (
  id              uuid primary key default gen_random_uuid(),
  params          jsonb not null,                  -- {style, format, medium, palette, max_strokes, layers, candidates}
  status          ai_job_status not null default 'queued',
  stage           text,                            -- 'Generating target', 'Decomposing into strokes', 'Rendering'
  progress        int not null default 0 check (progress between 0 and 100),
  gpu_cost_cents  int not null default 0,
  error           text,
  created_by      uuid references auth.users (id),
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);

create table ai_candidates (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references ai_jobs (id) on delete cascade,
  label         text not null,                     -- 'C-115-a'
  image_path    text not null,
  similarity    int not null check (similarity between 0 and 100),
  stroke_count  int not null,
  layers        int not null,
  stroke_plan   jsonb not null,                    -- layers → strokes, imported by the guide editor
  note          text,
  verdict       ai_verdict not null default 'pending',
  work_id       uuid references works (id),        -- set when approved (creates a draft work)
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ops
-- ---------------------------------------------------------------------------
create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id),
  action      text not null,                       -- 'order.refund', 'guide.publish', 'staff.invite'
  target      text,                                -- 'order:GS-2041'
  meta        jsonb not null default '{}',
  at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on works (status, sort_order);
create index on orders (user_id, created_at desc);
create index on orders (status, created_at desc);
create index on order_items (order_id);
create index on entitlements (user_id);
create index on print_copies (edition_id, status);
create index on reviews (work_id, status);
create index on support_threads (status, updated_at desc);
create index on ai_jobs (status, created_at);
create index on audit_log (at desc);

-- updated_at triggers
create trigger t_profiles_u before update on profiles for each row execute function set_updated_at();
create trigger t_works_u    before update on works    for each row execute function set_updated_at();
create trigger t_orders_u   before update on orders   for each row execute function set_updated_at();
create trigger t_threads_u  before update on support_threads for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Business functions
-- ---------------------------------------------------------------------------

-- Create the profile row when someone signs up (guest checkout included).
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Fill print_copies 1..edition_size when an edition is created.
create or replace function create_print_copies() returns trigger language plpgsql as $$
begin
  insert into print_copies (edition_id, number, certificate_no)
  select new.id, n, null from generate_series(1, new.edition_size) n;
  return new;
end $$;
create trigger t_edition_copies after insert on print_editions for each row execute function create_print_copies();

-- Assign the next free number of an edition to an order item. Row lock = two buyers never get the same number.
-- Returns null when the edition is sold out (checkout then offers another size or a refund).
create or replace function assign_print_copy(p_edition uuid, p_order_item uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_copy print_copies%rowtype;
  v_work text;
begin
  select * into v_copy from print_copies
   where edition_id = p_edition and status = 'available'
   order by number
   for update skip locked
   limit 1;
  if not found then return null; end if;

  select replace(w.number, 'N°', '') into v_work
    from print_editions e join works w on w.id = e.work_id where e.id = p_edition;

  update print_copies
     set status = 'sold', order_item_id = p_order_item, fulfilment = 'to_print',
         certificate_no = 'C-' || v_work || '-' || lpad(v_copy.number::text, 3, '0')
   where id = v_copy.id;
  return v_copy.number;
end $$;

-- Put a copy back (refund with restock).
create or replace function release_print_copy(p_order_item uuid) returns void
language sql security definer set search_path = public as $$
  update print_copies set status = 'available', order_item_id = null, fulfilment = 'not_required', certificate_no = null
   where order_item_id = p_order_item;
$$;

-- Decrement printable PDFs; raises when none left (support can reset).
create or replace function use_print_credit(p_entitlement uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  update entitlements set prints_left = prints_left - 1
   where id = p_entitlement and user_id = auth.uid() and revoked_at is null and prints_left > 0
   returning prints_left into v_left;
  if v_left is null then raise exception 'no_prints_left'; end if;
  return v_left;
end $$;

-- ---------------------------------------------------------------------------
-- Admin views (owner only through RLS on the base tables + security_invoker)
-- ---------------------------------------------------------------------------
create view v_daily_revenue with (security_invoker = true) as
  select date_trunc('day', paid_at)::date as day,
         sum(total_cents) as revenue_cents,
         count(*) as orders
    from orders where status in ('paid', 'partially_refunded')
   group by 1;

create view v_todo_counts with (security_invoker = true) as
  select
    (select count(*) from print_copies where fulfilment in ('to_print', 'printed', 'packed')) as prints_to_ship,
    (select count(*) from support_threads where status = 'open')                             as open_threads,
    (select count(*) from reviews where status = 'pending')                                   as reviews_pending,
    (select count(*) from ai_candidates where verdict = 'pending')                            as ai_to_validate,
    (select count(*) from print_editions e where e.open and
       (select count(*) from print_copies c where c.edition_id = e.id and c.status = 'available') <= 5) as editions_low;

create view v_pnl_monthly with (security_invoker = true) as
  with sales as (
    select date_trunc('month', o.paid_at)::date as month,
           sum(oi.unit_price_cents * oi.quantity) filter (where oi.kind = 'guide')     as guides_cents,
           sum(oi.unit_price_cents * oi.quantity) filter (where oi.kind = 'print')     as prints_cents,
           sum(oi.unit_price_cents * oi.quantity) filter (where oi.kind = 'gift_card') as gift_cards_cents
      from orders o join order_items oi on oi.order_id = o.id
     where o.paid_at is not null
     group by 1
  ), refs as (
    select date_trunc('month', created_at)::date as month, sum(amount_cents) as refunds_cents
      from refunds group by 1
  )
  select s.*, coalesce(r.refunds_cents, 0) as refunds_cents
    from sales s left join refs r using (month);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles              enable row level security;
alter table staff_roles           enable row level security;
alter table works                 enable row level security;
alter table work_formats          enable row level security;
alter table palettes              enable row level security;
alter table guides                enable row level security;
alter table guide_layers          enable row level security;
alter table guide_steps           enable row level security;
alter table guide_versions        enable row level security;
alter table shopping_items        enable row level security;
alter table print_editions        enable row level security;
alter table print_copies          enable row level security;
alter table carts                 enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table refunds               enable row level security;
alter table shipments             enable row level security;
alter table entitlements          enable row level security;
alter table devices               enable row level security;
alter table promo_codes           enable row level security;
alter table promo_redemptions     enable row level security;
alter table gift_cards            enable row level security;
alter table newsletter_subscribers enable row level security;
alter table campaigns             enable row level security;
alter table reviews               enable row level security;
alter table support_threads       enable row level security;
alter table support_messages      enable row level security;
alter table articles              enable row level security;
alter table site_settings         enable row level security;
alter table legal_documents       enable row level security;
alter table ai_jobs               enable row level security;
alter table ai_candidates         enable row level security;
alter table audit_log             enable row level security;

-- Public catalogue: anyone reads live works and their public data.
create policy "live works are public" on works for select using (status = 'live' or is_staff());
create policy "formats of live works" on work_formats for select using (exists (select 1 from works w where w.id = work_id and (w.status = 'live' or is_staff())));
create policy "palettes of live works" on palettes for select using (exists (select 1 from works w where w.id = work_id and (w.status = 'live' or is_staff())));
create policy "shopping lists are public" on shopping_items for select using (exists (select 1 from works w where w.id = work_id and (w.status = 'live' or is_staff())));
create policy "editions are public" on print_editions for select using (true);
create policy "copy availability is public" on print_copies for select using (true);
create policy "published articles" on articles for select using (status = 'published' or is_staff());
create policy "published legal" on legal_documents for select using (published_at is not null or is_staff());
create policy "public settings" on site_settings for select using (key like 'home.%' or is_staff());
create policy "published reviews" on reviews for select using (status in ('published', 'featured') or user_id = auth.uid() or is_staff());

-- Catalogue writes: owner + content.
create policy "content edits works"    on works          for all using (has_role('content')) with check (has_role('content'));
create policy "content edits formats"  on work_formats   for all using (has_role('content')) with check (has_role('content'));
create policy "content edits palettes" on palettes       for all using (has_role('content')) with check (has_role('content'));
create policy "content edits lists"    on shopping_items for all using (has_role('content')) with check (has_role('content'));
create policy "content edits articles" on articles       for all using (has_role('content')) with check (has_role('content'));
create policy "content edits legal"    on legal_documents for all using (has_role('owner')) with check (has_role('owner'));
create policy "owner edits settings"   on site_settings  for all using (has_role('owner') or (has_role('content') and key like 'home.%')) with check (has_role('owner') or (has_role('content') and key like 'home.%'));

-- Guides: drafts are staff-only; buyers read published versions of guides they own.
create policy "staff reads guides"       on guides        for select using (is_staff() or exists (select 1 from entitlements e where e.guide_id = guides.id and e.user_id = auth.uid() and e.revoked_at is null));
create policy "content edits guides"     on guides        for all using (has_role('content')) with check (has_role('content'));
create policy "content edits layers"     on guide_layers  for all using (has_role('content')) with check (has_role('content'));
create policy "content edits steps"      on guide_steps   for all using (has_role('content')) with check (has_role('content'));
create policy "owners read versions"     on guide_versions for select using (is_staff() or exists (select 1 from entitlements e where e.guide_id = guide_versions.guide_id and e.user_id = auth.uid() and e.revoked_at is null));
create policy "content publishes"        on guide_versions for insert with check (has_role('content'));

-- Editions & copies: owner + fulfilment manage.
create policy "fulfilment edits editions" on print_editions for all using (has_role('fulfilment')) with check (has_role('fulfilment'));
create policy "fulfilment edits copies"   on print_copies   for update using (has_role('fulfilment')) with check (has_role('fulfilment'));

-- People
create policy "me: read profile"   on profiles for select using (id = auth.uid() or has_role('support'));
create policy "me: update profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "staff reads roles"  on staff_roles for select using (user_id = auth.uid() or has_role('owner'));
create policy "owner manages team" on staff_roles for all using (has_role('owner')) with check (has_role('owner'));
create policy "me: cart"           on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "me: devices"        on devices for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders: customers read their own; staff by role. Writes happen server-side (service role) from the Stripe webhook.
create policy "me or staff: orders"      on orders      for select using (user_id = auth.uid() or has_role('support') or has_role('fulfilment'));
create policy "me or staff: items"       on order_items for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or has_role('support') or has_role('fulfilment'))));
create policy "support notes on orders"  on orders      for update using (has_role('support')) with check (has_role('support'));
create policy "fulfilment updates items" on order_items for update using (has_role('fulfilment')) with check (has_role('fulfilment'));
create policy "me or staff: shipments"   on shipments   for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or has_role('support') or has_role('fulfilment'))));
create policy "fulfilment ships"         on shipments   for all using (has_role('fulfilment')) with check (has_role('fulfilment'));
-- Refunds: owner any amount, support up to $50.
create policy "staff reads refunds"      on refunds for select using (has_role('support'));
create policy "refund limits"            on refunds for insert with check (has_role('owner') or (has_role('support') and amount_cents <= 5000));

-- Access
create policy "me: entitlements"         on entitlements for select using (user_id = auth.uid() or has_role('support'));
create policy "me: progress"             on entitlements for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "support resets prints"    on entitlements for update using (has_role('support')) with check (has_role('support'));

-- Growth: owner only (promo validation at checkout runs server-side with the service role).
create policy "owner: promos"       on promo_codes            for all using (has_role('owner')) with check (has_role('owner'));
create policy "owner: redemptions"  on promo_redemptions      for select using (has_role('owner'));
create policy "owner: gift cards"   on gift_cards             for all using (has_role('owner') or has_role('support')) with check (has_role('owner'));
create policy "owner: subscribers"  on newsletter_subscribers for all using (has_role('owner')) with check (has_role('owner'));
create policy "owner: campaigns"    on campaigns              for all using (has_role('owner')) with check (has_role('owner'));

-- Community
create policy "me: write review"     on reviews for insert with check (user_id = auth.uid() and exists (select 1 from entitlements e join guides g on g.id = e.guide_id where e.user_id = auth.uid() and g.work_id = reviews.work_id));
create policy "staff moderates"      on reviews for update using (has_role('support') or has_role('content')) with check (has_role('support') or has_role('content'));
create policy "me or support: threads"  on support_threads  for select using (user_id = auth.uid() or has_role('support'));
create policy "me: open thread"         on support_threads  for insert with check (user_id = auth.uid());
create policy "support: threads"        on support_threads  for update using (has_role('support')) with check (has_role('support'));
create policy "me or support: messages" on support_messages for select using (exists (select 1 from support_threads t where t.id = thread_id and (t.user_id = auth.uid() or has_role('support'))));
create policy "me or support: reply"    on support_messages for insert with check (exists (select 1 from support_threads t where t.id = thread_id and ((t.user_id = auth.uid() and not from_staff) or (has_role('support') and from_staff))));

-- AI
create policy "content: jobs"       on ai_jobs       for all using (has_role('content')) with check (has_role('content'));
create policy "content: candidates" on ai_candidates for all using (has_role('content')) with check (has_role('content'));

-- Audit: owner reads; inserts come from server actions (service role) only.
create policy "owner reads audit"   on audit_log for select using (has_role('owner'));

-- ---------------------------------------------------------------------------
-- Storage buckets (Supabase). Run once; policies mirror the rules above.
--   public-works   public   preview images, OG images
--   guides         private  generated PDFs (signed URL 60 s after entitlement check)
--   certificates   private  certificate PDFs
--   labels         private  shipping labels (fulfilment only)
--   results        private  customer result photos (public copy made when a review is published)
--   ai             private  AI candidates
-- ---------------------------------------------------------------------------
