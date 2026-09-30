-- 0005 · Original size (docs/decisions.md "Grid by original size").
--   works.original_size   the work's reference canvas among its three (canvas_formats), used by the grids
--                         only: the largest of the catalog fills a column, the others are reduced by the
--                         square root of their surface, 70 % of the column at least. Default: the medium one.

alter table works add column original_size text references canvas_formats (format);
update works w set original_size = c.format from canvas_formats c where c.proportion = w.proportion and c.size = 'medium';
alter table works alter column original_size set default '40x50';
alter table works alter column original_size set not null;

-- One of the work's three canvases: a change of proportion takes the new medium canvas unless a canvas
-- of the new family is given.
create or replace function works_original_in_family() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from canvas_formats c where c.format = new.original_size and c.proportion = new.proportion) then
    if tg_op = 'UPDATE' and new.proportion is distinct from old.proportion and new.original_size = old.original_size then
      select c.format into new.original_size from canvas_formats c where c.proportion = new.proportion and c.size = 'medium';
    else
      raise exception 'original size % is not a canvas of this work''s proportion %', new.original_size, new.proportion;
    end if;
  end if;
  return new;
end $$;
create trigger works_original_in_family before insert or update of original_size, proportion on works
  for each row execute function works_original_in_family();
