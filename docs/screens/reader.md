# Guide reader (PWA)

## Step view — `/learn/[entitlementId]?step=2c`

- **Boards:** GuideReader (desktop focus mode), AppStep (phone), Guide01–08 (the same content as a PDF).
- **Desktop layout:** no site chrome. Top bar: "← Library" · "N°03 · Layer 02 · Gestures" · links "Shopping list", "Print". StepProgress (15 clickable segments) full width. Split: CanvasDiagram left (current layer at full strength, earlier layers at 30%) · right: "Step c of e", brush line, instruction at 22 px, "On the plate" swatches, tip in a Mist panel, meta "Step 8 of 15 · 45 min, then dry 45 min". Bottom: ghost "Back", primary "Next step →" (large).
- **Phone layout:** "← N°03" · "Layer 2 · Gestures" · StepProgress · diagram · "Step c of e" · brush · instruction 14 px · Back / Next step pinned at the bottom (48 px).
- **Input:** ← → keys, swipe left/right on phone, segment click.
- **Data:** `guide_versions` (published) for the entitlement's guide, palette names from `palettes`, progress from `entitlements.progress`.
- **Events:** `guide_opened` (first), `guide_step_viewed`, `guide_completed`.
- **Acceptance:** reopening resumes the last step; works offline once opened online; text never below 14 px on phone.

## Drying timer — `/learn/[id]/timer?layer=2`

- **Boards:** GuideReader timer view, AppTimer. "Let layer 02 dry" · 96 px digits · Pause/Resume · "Skip, it's dry". Next layer unlocks at zero or on skip. Notification permission asked on first use only.

## Print — `/learn/[id]/print`

- **Boards:** AppPrint (phone, watermarked preview), Guide01–08 (A4 pages: cover, before you start, palette & mixes, the plan, layer 01, layer 02, layer 03, avoid mud & finish).
- **Rule:** each generation uses one credit (3 per purchase), watermark footer "Licensed to {email} · order {number}". At 0: "No prints left. Ask us for more." (support can reset).

## PWA

- Manifest: name "Geste", short_name "Geste", start_url `/learn`, scope `/learn`, display standalone, background #FAFAF8, theme #111111, icons from BrandFavicon.
- Install prompt: after the first guide is opened on a phone, a quiet line "Install Geste to paint offline" with "Install" — never a modal.
- Offline: app shell + every owned guide version + diagrams cached; videos online only.
