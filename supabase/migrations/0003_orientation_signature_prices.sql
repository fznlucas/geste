-- 0003 · Orientation, Signature works and the new prices (docs/decisions.md "Orientation", "Prices by format"):
--   works.orientation         'portrait' | 'landscape': a landscape work sells its formats turned (40×30 … 100×80),
--                             same guide, same price, and is shown landscape everywhere
--   works.signature           the guide costs SIGNATURE_CENTS more on every format (src/lib/pricing.ts)
--   works.preview_width/height pixel size of the preview: grids give every work the same height, its own width
--   work_formats              the guide price depends on the format only: level included, "Custom" is free
--   print_editions.size       'S' (A3, 30×42) · 'M' (A2, 42×59) · 'L' (50×70), turned for a landscape work
--   order_items.discount_cents guide + print of the same work in one order: −15 % on both lines
-- Prices are still computed on the server with src/lib/pricing.ts; these columns are what it reads.

alter table works add column orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape'));
alter table works add column signature   boolean not null default false;
-- Pixel size of the preview image, read when it is uploaded: grids size each work by its real ratio.
alter table works add column preview_width  int check (preview_width > 0);
alter table works add column preview_height int check (preview_height > 0);

comment on column work_formats.guide_price_cents is 'Guide price for any level; the Signature supplement is added by pricing.ts';

-- Rows still at the old defaults (base + level surcharge) move to the new prices; prices set in the admin stay.
update work_formats set guide_price_cents = case format
    when '30x40'  then 1500
    when '40x50'  then 1900
    when '60x80'  then 2500
    when '80x100' then 2900
  end
 where (format, guide_price_cents) in (('30x40', 1200), ('40x50', 1300), ('60x80', 1700), ('80x100', 2100));

-- Print sizes: A3 → S, A2 → M, 50×70 → L, with the new default prices and edition sizes where untouched.
update print_editions set size = case size when 'A3' then 'S' when 'A2' then 'M' when '50×70' then 'L' else size end;
update print_editions set price_cents = 5500,  edition_size = greatest(edition_size, 100) where size = 'S' and price_cents = 4500;
update print_editions set price_cents = 9500,  edition_size = greatest(edition_size, 50)  where size = 'M' and price_cents = 7500;
update print_editions set price_cents = 14500                                             where size = 'L' and price_cents = 9500;
alter table print_editions add constraint print_editions_size_check check (size in ('S', 'M', 'L'));
alter table print_editions add constraint print_editions_price_check check (price_cents > 0);

alter table order_items add column discount_cents int not null default 0 check (discount_cents >= 0);
alter table order_items add constraint order_items_discount_le_line check (discount_cents <= unit_price_cents * quantity);

-- Revenue net of the bundle discount (the order-level discount_cents stays the sum of the lines').
create or replace view v_pnl_monthly with (security_invoker = true) as
  with sales as (
    select date_trunc('month', o.paid_at)::date as month,
           sum(oi.unit_price_cents * oi.quantity - oi.discount_cents) filter (where oi.kind = 'guide')     as guides_cents,
           sum(oi.unit_price_cents * oi.quantity - oi.discount_cents) filter (where oi.kind = 'print')     as prints_cents,
           sum(oi.unit_price_cents * oi.quantity - oi.discount_cents) filter (where oi.kind = 'gift_card') as gift_cards_cents
      from orders o join order_items oi on oi.order_id = o.id
     where o.paid_at is not null
     group by 1
  ), refs as (
    select date_trunc('month', created_at)::date as month, sum(amount_cents) as refunds_cents
      from refunds group by 1
  )
  select s.*, coalesce(r.refunds_cents, 0) as refunds_cents
    from sales s left join refs r using (month);
