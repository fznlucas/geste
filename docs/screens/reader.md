# Guide reader (PWA)

## Step view — `/learn/[entitlementId]?step=2c`

- **Boards:** GuideReader (desktop focus mode), AppStep (phone), Guide01–08 (the same content as a PDF).
- **Desktop layout:** no site chrome. Top bar: "← Library" · "N°03 · Layer 02 · Gestures" · links "Shopping list", "Print". StepProgress (15 clickable segments) full width. Split: CanvasDiagram left (current layer at full strength, earlier layers at 30%) · right: "Step c of e", brush line, instruction at 22 px, "On the plate" swatches, tip in a Mist panel, meta "Step 8 of 15 · 45 min, then dry 45 min". Bottom: ghost "Back", primary "Next step →" (large).
- **Phone layout:** "← N°03" · "Layer 2 · Gestures" · StepProgress · diagram · "Step c of e" · brush · instruction 14 px · Back / Next step pinned at the bottom (48 px).
- **Input:** ← → keys, swipe left/right on phone, segment click.
- **Data:** `guide_versions` (published) for the entitlement's guide, palette names from `palettes`, progress from `entitlements.progress`.
- **Events:** `guide_opened` (first), `guide_step_viewed`, `guide_completed`.
- **Acceptance:** reopening resumes the last step; works offline once opened online; text never below 14 px on phone. ✓ M5 mock: resumes (Library and reader share `progress`), ← → / swipe / segments, events; the instruction is 14 px on phone (AppStep keeps its 12 px labels). Offline caching waits for the PWA (M8); an "Offline — your guides are saved on this device" line shows when the browser is offline. Boards over this spec: docs/decisions.md "Reader (M5)".

## Drying timer — `/learn/[id]/timer?layer=2`

- **Boards:** GuideReader timer view, AppTimer. "Let layer 02 dry" · 96 px digits · Pause/Resume · "Skip, it's dry". Next layer unlocks at zero or on skip. Notification permission asked on first use only.

## Print — `/learn/[id]/print`

- **Boards:** AppPrint (phone, watermarked preview), Guide01–08 (A4 pages: cover, before you start, palette & mixes, the plan, layer 01, layer 02, layer 03, avoid mud & finish).
- **Rule:** each generation uses one credit (3 per purchase), watermark footer "Licensed to {email} · order {number}". At 0: "No prints left. Ask us for more." (support can reset). M5 mock: watermarked A4 preview + browser print, no credit spent; the footer carries name, email and order (decisions "Reader (M5)").

## PWA

- Manifest: name "Geste", short_name "Geste", start_url `/learn`, scope `/learn`, display standalone, background #FAFAF8, theme #111111, icons from BrandFavicon.
- Install prompt: after the first guide is opened on a phone, a quiet line "Install Geste to paint offline" with "Install" — never a modal.
- Offline: app shell + every owned guide version + diagrams cached; videos online only.
- ✓ M8 mock: `src/app/manifest.ts` as above (start_url and scope under the base path, icons 192 / 512, "any" and "maskable"); `/learn` opens the last guide touched on this device. The service worker (`src/sw/sw.ts`, Serwist) precaches `/learn` and the icons, caches reader pages network-first and build files cache-first; once a guide is open online the reader asks it to keep that guide's step, timer and print pages and every file they load ("WARM_GUIDE"), so the guide works offline after one online visit (the mock's guide content ships in those files). Install: the phone line "Install Geste to paint offline" · "Not now" · "Install" on top of the reader when the browser offers it (Chrome, Edge, Android; iOS has no prompt). Out of scope offline: the Library and the store (scope `/learn`). `e2e/pwa.spec.ts` checks the manifest and opens a guide, its timer and `/learn` with the network off.
