import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Info, Wifi, WifiOff } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/primitives";
import { GenerationStepper, GENERATION_STEPS } from "@/components/GenerationStepper";
import { GradientBlobAura } from "@/components/ui/gradient-bold-card";
import GatewayFlow from "@/components/ui/gateway-flow";
import { analyze, generateContent, generateStructure, projects as projectApi } from "@/api/client";
import { generate } from "@/lib/generator";
import { deterministicRoles, KNOWN_ROLES } from "@/lib/designIntelligence";
import { buildStructureProvenance, formatStructureProvenance } from "@/lib/structureDiagnostics";
import type { CreateProjectInput } from "@/types/schema";

const PLATFORMS = [
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
] as const;

const STYLES = ["Minimal", "Premium", "Dark", "Energetic", "Corporate", "Playful"];

const EXAMPLES: Array<{ label: string; prompt: string }> = [
  { label: "Food delivery", prompt: "A food delivery app where users sign up, browse restaurants, search dishes, add to cart and checkout." },
  { label: "Fitness", prompt: "A fitness tracking app for college students to log workouts, track progress and follow plans." },
  { label: "Banking", prompt: "A mobile banking app to check balance, view transactions, transfer money and pay bills." },
  { label: "Education", prompt: "An e-learning app where students browse courses, watch lessons, take quizzes and track progress." },
];

type Phase = "form" | "generating";

export default function CreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [usedBackend, setUsedBackend] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  // Clarification prompt shown when the model isn't confident enough about the
  // domain to generate a meaningful prototype (e.g. meaningless/too-vague input).
  const [clarify, setClarify] = useState<string | null>(null);

  const prefill = (location.state as { description?: string; autostart?: boolean } | null) ?? null;

  const [form, setForm] = useState<CreateProjectInput>({
    name: "",
    description: prefill?.description ?? "",
    targetPlatform: "ios",
    designStyle: "Minimal",
    targetAudience: "",
  });

  const set = <K extends keyof CreateProjectInput>(k: K, v: CreateProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleGenerate() {
    setError(null);
    setClarify(null);
    if (form.description.trim().length < 12) {
      setError("Describe your app in a sentence or two so the model has something to work with.");
      return;
    }
    const name = form.name.trim() || inferName(form.description);
    const input = { ...form, name };

    setPhase("generating");
    setStep(0);

    try {
      // Kick off analysis and a minimum animation duration in parallel so the
      // stepper always feels intentional (not a flash).
      const analysisPromise = analyze(input.description);
      const stepTimers = GENERATION_STEPS.map((_, i) =>
        setTimeout(() => setStep(i + 1), 350 + i * 320),
      );

      const [{ analysis, usedBackend }] = await Promise.all([
        analysisPromise,
        new Promise((r) => setTimeout(r, GENERATION_STEPS.length * 320 + 500)),
      ]);
      stepTimers.forEach(clearTimeout);

      // Confidence gate: if the model couldn't confidently identify the domain
      // (meaningless or too-vague input), don't fabricate a prototype — return
      // to the form and ask for a clearer description.
      if (analysis.needsClarification) {
        setUsedBackend(usedBackend);
        setClarify(
          analysis.clarification ??
            "I need a bit more detail about what this app does before I can generate it.",
        );
        setPhase("form");
        return;
      }

      setStep(GENERATION_STEPS.length);
      setUsedBackend(usedBackend);

      const features = analysis.features.map((f) => f.name);
      // Smart tier (Phase 1 + 2): try the LLM for request-specific content AND a
      // proposed screen structure, in parallel. Each independently resolves to
      // null on any miss, so generate() falls back to its deterministic library
      // (content) and requirement-driven screen selection (structure) offline.
      const [content, structureOutcome] = await Promise.all([
        generateContent({
          appType: analysis.appType,
          appName: name,
          description: input.description,
          features,
        }).catch(() => null),
        generateStructure({
          appType: analysis.appType,
          appName: name,
          description: input.description,
          features,
          candidateRoles: deterministicRoles(analysis),
          allowedRoles: KNOWN_ROLES,
        }).catch(() => null),
      ]);

      const structure = structureOutcome?.plan ?? null;
      const prototype = generate(
        analysis,
        input,
        { structure: structure ?? undefined },
        content ?? undefined,
      );

      // Phase 2 structure-pipeline provenance (development only). A safe,
      // role-names-only trace showing where structural intelligence is kept or
      // lost: raw LLM proposal → validated → dropped → repair-added → final →
      // bottom-nav → source. No prompt text, keys, or secrets are logged.
      if (import.meta.env.DEV) {
        const prov = buildStructureProvenance({
          appType: analysis.appType,
          source: structureOutcome?.source ?? "fallback",
          proposedRoles: structureOutcome?.proposedRoles ?? [],
          plan: structure,
          prototype,
        });
        console.info(formatStructureProvenance(prov));
      }

      const project = await projectApi.create(input, prototype);

      setTimeout(() => navigate(`/workspace/${project.id}`), 650);
    } catch (e) {
      setPhase("form");
      setError("Something went wrong while generating. Please try again.");
    }
  }

  // If the landing hero handed us a description with autostart, run once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (prefill?.autostart && (prefill.description ?? "").trim().length >= 12) {
      started.current = true;
      // clear router state so a refresh doesn't re-trigger
      navigate(location.pathname, { replace: true, state: null });
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-screen bg-canvas">
      {/* Live, light-mode GatewayFlow current behind the composer. Fixed +
          pointer-events-none + low opacity so it stays a quiet ambient
          backdrop; the white composer card sits opaque above it (z-10). */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80" aria-hidden>
        <GatewayFlow mode="light" className="h-full w-full" />
      </div>
      <div className="relative z-10">
      <TopNav />
      <AnimatePresence mode="wait">
        {phase === "form" ? (
          <motion.main
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto max-w-2xl px-6 py-16 md:py-20"
          >
            <div className="text-center">
              <h1 className="font-display text-display text-ink">Describe your app</h1>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Write it the way you'd explain it to a colleague. Morph reads the
                description, understands what it needs, and generates the prototype.
              </p>
            </div>

            {/* The composer — the focus of the page. */}
            <div className="relative mt-10">
              {/* Animated gradient-blob aura drifting behind the composer. */}
              <GradientBlobAura />
              <div
                className={[
                  "relative rounded-2xl border bg-white transition-all duration-200 ease-out-expo",
                  focused ? "border-morph-300 shadow-raised" : "border-line shadow-soft",
                ].join(" ")}
              >
              <div className="flex items-center gap-2 px-5 pt-4">
                <span className="h-1.5 w-1.5 rounded-full bg-morph-500" />
                <span className="text-xs font-medium text-ink-muted">Requirement</span>
              </div>
              <label htmlFor="description" className="sr-only">
                What should the app do?
              </label>
              <textarea
                id="description"
                value={form.description}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => set("description", e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate();
                }}
                placeholder="A food delivery app where users sign up, browse restaurants, add items to a cart and place an order…"
                rows={5}
                className="composer-field block w-full resize-none bg-transparent px-5 pb-4 pt-3 text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
              />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3">
                <span className="text-xs text-ink-faint">Try</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => set("description", ex.prompt)}
                    className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            {/* Quiet options — supporting, not competing with the composer. */}
            <div className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <Field label="Project name" hint="Optional">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Feast"
                  className="input-field"
                />
              </Field>
              <Field label="Target audience" hint="Optional">
                <input
                  value={form.targetAudience}
                  onChange={(e) => set("targetAudience", e.target.value)}
                  placeholder="e.g. college students"
                  className="input-field"
                />
              </Field>

              <Field label="Target platform">
                <div className="inline-flex rounded-lg border border-line p-0.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => set("targetPlatform", p.id)}
                      className={[
                        "h-9 rounded-[7px] px-5 text-sm font-medium transition-colors",
                        form.targetPlatform === p.id
                          ? "bg-ink text-white"
                          : "text-ink-muted hover:text-ink",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Design style">
                <select
                  value={form.designStyle}
                  onChange={(e) => set("designStyle", e.target.value)}
                  className="input-field"
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/[0.06] p-3.5 text-sm text-danger"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </motion.div>
            )}

            {clarify && (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-2.5 rounded-xl border border-morph-200 bg-morph-50 p-3.5 text-sm text-ink"
              >
                <Info size={16} className="mt-0.5 shrink-0 text-morph-600" />
                <span>
                  <span className="font-medium">The model isn't confident about this one. </span>
                  {clarify}
                </span>
              </motion.div>
            )}

            <div className="mt-9 flex items-center justify-between gap-4">
              <div className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
                <span className="ml-1">to generate</span>
              </div>
              <Button size="lg" className="ml-auto" onClick={handleGenerate}>
                Generate prototype
              </Button>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="gen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center"
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface shadow-soft">
              <span className="font-display text-xl font-semibold text-ink">M</span>
            </div>
            <h2 className="font-display text-title text-ink">
              {step >= GENERATION_STEPS.length ? "Prototype ready" : "Generating your prototype"}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {step >= GENERATION_STEPS.length ? "Opening the editor…" : "This takes just a moment."}
            </p>
            <div className="mt-10 w-full max-w-xs text-left">
              <GenerationStepper active={step} />
            </div>
            {usedBackend !== null && (
              <div className="mt-8 flex items-center gap-1.5 text-xs text-ink-muted">
                {usedBackend ? <Wifi size={13} /> : <WifiOff size={13} />}
                {usedBackend ? "Analyzed with the trained ML backend" : "Analyzed with the offline model"}
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          height: 2.5rem;
          border-radius: 0.625rem;
          border: 1px solid rgba(23,22,27,0.15);
          background: #FFFFFF;
          padding: 0 0.875rem;
          font-size: 0.9375rem;
          color: #17161B;
          outline: none;
          transition: border-color .15s;
        }
        .input-field:focus { border-color: rgba(23,22,27,0.4); }
        .input-field::placeholder { color: #A2A0A9; }
        select.input-field { appearance: none; cursor: pointer; }
      `}</style>
    </motion.div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function inferName(description: string): string {
  const m = description.match(/\b([A-Z][a-z]+)\b/);
  return m ? m[1] : "Untitled App";
}
