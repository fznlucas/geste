"use client";

/**
 * AdminAIPipeline: "New generation" form (style, format, medium, palette = real tubes, max strokes,
 * layers, candidates) with its GPU estimate and the month's budget; running jobs with their stage and
 * progress; candidates to validate (Approve → draft work, ✕ → rejected). The GPU worker is simulated
 * while the page is open (`advanceJobs` every 2 s); a job that would pass the budget is blocked.
 */
import { useEffect, useState } from "react";
import { AdminBox, AdminMeter, AdminRow, AdminTabs, AdminTitle, AiCandidateCard, Button, Field, Input, Select, useToast } from "@/components";
import {
  AI_FORMATS, AI_MEDIUMS, AI_PALETTES, AI_STYLES, aiJobCostCents, getAiPipeline,
  type AiBudget, type AiCandidate, type AiJob, type AiJobParams, type AiPipeline,
} from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { AiBudgetError, advanceJobs, approveCandidate, createJob, rejectCandidate, validateJob } from "@/lib/client/admin/ai";
import { formatPrice } from "@/lib/format";
import { CANVASES, formatLabel } from "@/lib/pricing";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

/** Simulated worker tick. */

export function AiPipelinePage() {
  const q = useAdminQuery(getAiPipeline, []);
  const { staff } = useAdmin();
  const running = (q.data?.running.length ?? 0) > 0;

  // The simulated GPU worker runs from the admin frame (any admin page); here it catches up at once.
  useEffect(() => {
    if (running && (staff.role === "owner" || staff.role === "content")) advanceJobs();
  }, [running, staff.role]);

  return (
    <AdminPage title="AI pipeline" breadcrumbs={[{ label: "Catalog", href: "/admin/works" }]} roles={["content"]} desktopHref="/admin/ai">
      {q.status === "loading" ? <div aria-busy="true" className="h-600 bg-surface-muted" /> : <Pipeline data={q.data} />}
    </AdminPage>
  );
}

function Pipeline({ data }: { data: AiPipeline }) {
  const [show, setShow] = useState<"pending" | "decided">("pending");
  const decided = data.candidates.filter((c) => c.status !== "pending");
  const shown = show === "pending" ? data.candidates.filter((c) => c.status === "pending") : decided;
  return (
    <div className="grid grid-cols-1 items-start gap-16 min-[1200px]:grid-cols-12">
      <NewGeneration budget={data.budget} nextJob={data.nextJobNumber} className="min-[1200px]:col-span-4" />
      <div className="flex flex-col gap-16 min-[1200px]:col-span-8">
        <AdminBox>
          <AdminTitle>Running</AdminTitle>
          {data.running.length ? (
            <div role="table" aria-label="Running jobs" tabIndex={0} className="flex flex-col gap-14 overflow-x-auto focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg">
              {/* Phones scroll the four columns sideways instead of crushing them. */}
              {data.running.map((j) => <JobRow key={j.id} job={j} />)}
            </div>
          ) : (
            <p className="text-fg-muted">Nothing running. New candidates appear below when a job ends.</p>
          )}
        </AdminBox>
        {/* #to-validate: the sidebar's AI count opens here. */}
        <AdminBox id="to-validate" className="scroll-mt-16">
          <div className="flex flex-col gap-4 min-[1200px]:flex-row min-[1200px]:justify-between min-[1200px]:gap-0">
            <AdminTitle>To validate · {data.toValidate}</AdminTitle>
            <span className="text-fg-muted">Similarity = how close the stroke render is to the target. Approve only what you would paint yourself.</span>
          </div>
          {/* Decided cards leave the list for "Decided" (the last week's approvals and rejections). */}
          <AdminTabs label="Candidate lists" tabs={[{ value: "pending", label: `To validate · ${data.toValidate}` }, { value: "decided", label: `Decided · ${decided.length}` }]} value={show} onChange={setShow} className="self-start" />
          {shown.length ? (
            <ul className="grid grid-cols-2 gap-14 sm:grid-cols-3 min-[1200px]:grid-cols-5">
              {shown.map((c) => <Candidate key={c.id} c={c} />)}
            </ul>
          ) : (
            <p className="text-fg-muted">{show === "pending" ? "Nothing to validate." : "No decision this week."}</p>
          )}
        </AdminBox>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: AiJob }) {
  return (
    <AdminRow cols="80px 1fr 220px 140px" className="min-w-600">
      <span role="cell">{job.name}</span>
      <span role="cell">{job.label}</span>
      <span role="cell" className="text-fg-muted">{job.stage}</span>
      <span role="cell">
        <AdminMeter pct={job.progress} label={`${job.name}: ${job.progress}%`} />
      </span>
    </AdminRow>
  );
}

const DEFAULTS: AiJobParams = { style: "gestural", format: "60x80", medium: "acrylic", palette: "original", maxStrokes: 120, layers: 3, candidates: 8 };

function NewGeneration({ budget, nextJob, className }: { budget: AiBudget; nextJob: number; className?: string }) {
  const toast = useToast();
  const [p, setP] = useState<AiJobParams>(DEFAULTS);
  const [raw, setRaw] = useState({ maxStrokes: "120", layers: "3", candidates: "8" });
  const [queued, setQueued] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const errors = validateJob(p);
  const cost = aiJobCostCents(Number.isInteger(p.candidates) && p.candidates > 0 ? p.candidates : 0);
  const blocked = cost > budget.leftCents;
  const set = <K extends keyof AiJobParams>(k: K, v: AiJobParams[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setQueued(null);
  };
  const setNum = (k: "maxStrokes" | "layers" | "candidates", v: string) => {
    setRaw((x) => ({ ...x, [k]: v }));
    set(k, /^\d+$/.test(v.trim()) ? Number(v) : Number.NaN);
  };
  const launch = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    try {
      setQueued(await createJob(p));
    } catch (e) {
      toast.show(e instanceof AiBudgetError ? e.message : "Could not start the job", { tone: "danger" });
    }
  };
  const err = (k: "maxStrokes" | "layers" | "candidates") => (touched ? errors[k] : undefined);

  return (
    <AdminBox className={className}>
      <AdminTitle>New generation</AdminTitle>
      {/* 7 px under the labels: the board's native selects sit 1 px lower than the text fields (as in Checkout). */}
      <Field label="Style reference" className="[&>label]:mb-7">
        <Select value={p.style} onChange={(e) => set("style", e.target.value as AiJobParams["style"])}>
          {AI_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-10">
        <Field label="Format" className="[&>label]:mb-7">
          <Select value={p.format} onChange={(e) => set("format", e.target.value as AiJobParams["format"])}>
            {AI_FORMATS.map((f) => <option key={f} value={f}>{CANVASES[f].proportion} · {formatLabel(f)}</option>)}
          </Select>
        </Field>
        <Field label="Medium" className="[&>label]:mb-7">
          <Select value={p.medium} onChange={(e) => set("medium", e.target.value as AiJobParams["medium"])}>
            {AI_MEDIUMS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Palette = your real tubes" className="[&>label]:mb-7">
        <Select value={p.palette} onChange={(e) => set("palette", e.target.value as AiJobParams["palette"])}>
          {AI_PALETTES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-10">
        <Field label="Max strokes" error={err("maxStrokes")}>
          <Input inputMode="numeric" value={raw.maxStrokes} onChange={(e) => setNum("maxStrokes", e.target.value)} />
        </Field>
        <Field label="Layers" error={err("layers")}>
          <Input inputMode="numeric" value={raw.layers} onChange={(e) => setNum("layers", e.target.value)} />
        </Field>
      </div>
      <Field label="Candidates" error={err("candidates")}>
        <Input inputMode="numeric" value={raw.candidates} onChange={(e) => setNum("candidates", e.target.value)} />
      </Field>
      <Button fullWidth trailing={`≈ ${money(cost)} GPU`} disabled={blocked} onClick={launch} aria-describedby="ai-budget">
        {queued ? `Queued · Job ${queued}` : `Generate ${Number.isInteger(p.candidates) ? p.candidates : raw.candidates} candidates`}
      </Button>
      <span id="ai-budget" className="text-fg-muted">
        GPU this month: {money(budget.spentCents)} of {formatPrice(budget.budgetCents)} budget
      </span>
      <AdminMeter pct={(budget.spentCents / budget.budgetCents) * 100} label="GPU budget used" />
      {blocked && (
        <p role="alert" className="text-danger">
          Budget reached: {money(budget.leftCents)} left this month. Ask for fewer candidates or raise the budget in Settings.
        </p>
      )}
      {queued !== null && <span className="sr-only" role="status">Job {queued} queued. Next: Job {nextJob}.</span>}
    </AdminBox>
  );
}

/** "$38.20", "$1.40": GPU amounts keep their cents. */
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function Candidate({ c }: { c: AiCandidate }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const decide = async (ok: boolean) => {
    setBusy(true);
    try {
      if (ok) {
        const slug = await approveCandidate(c.id);
        toast.show(`${c.id} approved · ${slug.replace("n", "N°")} is a draft work`);
      } else {
        await rejectCandidate(c.id);
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return <AiCandidateCard {...c} busy={busy} onApprove={() => decide(true)} onReject={() => decide(false)} workHref={c.workHref} />;
}
