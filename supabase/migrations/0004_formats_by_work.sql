-- 0004 · Formats by work (docs/decisions.md "Formats by work", "Levels").
-- Each work keeps its own proportion and sells the three stock canvases of that family, turned for a
-- landscape work. The four formats common to every work are gone.
--   works.proportion            '3:4' 30×40 · 46×61 · 60×80   '4:5' 24×30 · 40×50 · 80×100   '5:6' 38×46 · 50×60 · 60×73
--   works.base_level            the work's level on its medium canvas, by its complexity; the default level
--                               of a canvas is one step below on the small one, one above on the large one
--                               (pricing.ts defaultLevel). Below the base level a guide is a simplified version.
--   works.default_format        the medium canvas of the proportion (cards show its price)
--   work_formats                the three canvases of the proportion; default_level is dropped (derived)
--   shopping_items.quantity_kind replaces quantity_rule: quantities follow the canvas's surface in cm²
-- Default guide prices: small $15, medium $19, large $25, 80×100 $29. Signature (+$6) and the guide + print
-- bundle (−15 %) do not change. Prices are still computed on the server with src/lib/pricing.ts.

alter table works add column proportion text not null default '4:5' check (proportion in ('3:4', '4:5', '5:6'));
alter table works add column base_level guide_level not null default 'intermediate';

-- The nearest family to the preview image (short side / long side); a nearly square image is cropped
-- at the centre to 5:6. Works without their image yet stay 4:5 until it is uploaded.
update works set proportion = (
  select v.p from (values ('3:4', 3.0 / 4), ('4:5', 4.0 / 5), ('5:6', 5.0 / 6)) as v (p, r)
   order by abs(least(preview_width, preview_height)::numeric / greatest(preview_width, preview_height) - v.r)
   limit 1)
 where preview_width is not null and preview_height is not null;

-- Base level: the level the work was shown at on its card (its old default format), to review in the admin.
update works w set base_level = wf.default_level
  from work_formats wf
 where wf.work_id = w.id and wf.format = w.default_format;

-- The canvases, and the three of each family (small, medium, large).
create table canvas_formats (
  format      text primary key,
  proportion  text not null check (proportion in ('3:4', '4:5', '5:6')),
  size        text not null check (size in ('small', 'medium', 'large')),
  width_cm    int  not null,
  height_cm   int  not null,
  guide_price_cents int not null check (guide_price_cents > 0),   -- default, admin overrides per work in work_formats
  unique (proportion, size)
);
insert into canvas_formats (format, proportion, size, width_cm, height_cm, guide_price_cents) values
  ('30x40',  '3:4', 'small',  30,  40, 1500),
  ('46x61',  '3:4', 'medium', 46,  61, 1900),
  ('60x80',  '3:4', 'large',  60,  80, 2500),
  ('24x30',  '4:5', 'small',  24,  30, 1500),
  ('40x50',  '4:5', 'medium', 40,  50, 1900),
  ('80x100', '4:5', 'large',  80, 100, 2900),
  ('38x46',  '5:6', 'small',  38,  46, 1500),
  ('50x60',  '5:6', 'medium', 50,  60, 1900),
  ('60x73',  '5:6', 'large',  60,  73, 2500);
alter table canvas_formats enable row level security;
create policy "canvases are public" on canvas_formats for select using (true);

-- Default level of a canvas for a base level: one step down on small, one up on large, clamped.
create or replace function canvas_default_level(f text, base guide_level) returns guide_level language sql stable set search_path = public as $$
  select (enum_range(null::guide_level))[
    greatest(1, least(3, array_position(enum_range(null::guide_level), base)
      + case (select size from canvas_formats where format = f) when 'small' then -1 when 'large' then 1 else 0 end))];
$$;

-- Painting time: 60 min on 30×40 at Beginner, growing with the surface to the power 2/3, × the level's
-- factor (1, 1.4, 2), rounded to 10 minutes. Same formula as pricing.ts estimatedMinutes.
create or replace function canvas_minutes(f text, lvl guide_level) returns int language sql stable set search_path = public as $$
  select (round(60 * power(c.width_cm * c.height_cm / 1200.0, 2.0 / 3)
    * case lvl when 'beginner' then 1 when 'intermediate' then 1.4 else 2 end / 10) * 10)::int
    from canvas_formats c where c.format = f;
$$;

-- work_formats: keep a row whose canvas is still in the work's family (30×40, 40×50, 60×80 and 80×100 keep
-- their defaults: $15, $19, $25, $29), drop the others, add the missing canvases at their default price.
alter table work_formats drop constraint if exists work_formats_format_check;
alter table work_formats drop column default_level;
delete from work_formats wf using works w, canvas_formats c
 where w.id = wf.work_id and c.format = wf.format and c.proportion <> w.proportion;
delete from work_formats wf where not exists (select 1 from canvas_formats c where c.format = wf.format);
insert into work_formats (work_id, format, guide_price_cents, est_minutes)
  select w.id, c.format, c.guide_price_cents, 0
    from works w join canvas_formats c on c.proportion = w.proportion
   where not exists (select 1 from work_formats wf where wf.work_id = w.id and wf.format = c.format);
update work_formats wf set est_minutes = canvas_minutes(wf.format, canvas_default_level(wf.format, w.base_level))
  from works w where w.id = wf.work_id;
alter table work_formats add constraint work_formats_format_fkey foreign key (format) references canvas_formats (format);
comment on column work_formats.est_minutes is 'At the default level of the canvas for the work (canvas_minutes)';

-- A format must be one of the work's three canvases.
create or replace function work_formats_in_family() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from works w join canvas_formats c on c.proportion = w.proportion where w.id = new.work_id and c.format = new.format) then
    raise exception 'format % is not a canvas of this work''s proportion', new.format;
  end if;
  return new;
end $$;
create trigger work_formats_in_family before insert or update on work_formats for each row execute function work_formats_in_family();

-- Default format: the medium canvas of the proportion.
alter table works drop constraint if exists works_default_format_check;
update works w set default_format = c.format from canvas_formats c where c.proportion = w.proportion and c.size = 'medium';
alter table works alter column default_format set default '40x50';
alter table works add constraint works_default_format_fkey foreign key (default_format) references canvas_formats (format);

-- Guides of an old canvas move to the same size in the work's family (30×40 → small, 40×50 → medium,
-- 60×80 and 80×100 → large) when that guide does not exist yet; others stay as they are, still readable
-- by their owners, no longer sold.
update guides g set format = c.format
  from works w, canvas_formats c
 where w.id = g.work_id and c.proportion = w.proportion
   and c.size = case g.format when '30x40' then 'small' when '40x50' then 'medium' else 'large' end
   and not exists (select 1 from canvas_formats x where x.format = g.format and x.proportion = w.proportion)
   and not exists (select 1 from guides o where o.work_id = g.work_id and o.format = c.format and o.level = g.level);

-- Shopping list: what a line scales with. Its quantity is computed from the canvas's surface.
alter table shopping_items add column quantity_kind text check (quantity_kind in ('canvas', 'tube', 'white'));
update shopping_items set quantity_kind = case
    when name = 'Canvas' then 'canvas'
    when name ilike '%white%' then 'white'
    when quantity_rule::text like '%ml%' then 'tube'
  end;
alter table shopping_items drop column quantity_rule;
