-- 0002 · Guide fields added by the reader (M5), until then mock-only (docs/decisions.md "Mock-only fields"):
--   guide_layers.minutes   painting time of the layer ("45 min, then dry 45 min": dry time is dry_seconds)
--   guide_steps.brush      the brush of one step (AppStep); null = the layer's brush, '—' = no brush (wash, dry)
--   guide_print            the printed guide's longer copy (Guide01–08 boards), one row per guide
-- Editing these never reaches buyers until "Publish" copies them into guide_versions.content
-- (layers[].minutes, layers[].steps[].brush, print), like the rest of the guide.

alter table guide_layers add column minutes int not null default 0 check (minutes >= 0);

alter table guide_steps add column brush text check (brush is null or length(brush) between 1 and 60);

-- Draft of the printed guide. Not on `guides` because buyers can read their guide rows and drafts must stay staff-only.
create table guide_print (
  guide_id        uuid primary key references guides (id) on delete cascade,
  content         jsonb not null check (jsonb_typeof(content) = 'object'),
  -- {box_tools[], kitchen[], rules[], tubes[{hex,name}], mixes[{name,hex,parts[{hex,name}]}], mix_note, plan,
  --  brushes[{name,use}], layers[{summary,brush,colour,tip,steps[]}], mud{first,second,mixed,clean,muddy},
  --  fixes[{problem,fix}], sign[]}
  updated_at      timestamptz not null default now()
);

create trigger t_guide_print_u before update on guide_print for each row execute function set_updated_at();

alter table guide_print enable row level security;

create policy "staff reads print copy"   on guide_print for select using (is_staff());
create policy "content edits print copy" on guide_print for all    using (has_role('content')) with check (has_role('content'));
