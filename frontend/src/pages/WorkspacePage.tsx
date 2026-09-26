import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Undo2, Redo2, Save, Download, RotateCcw, Smartphone,
  SlidersHorizontal, Brain, GitBranch, Check, Palette, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/Button";
import { PrototypePlayer } from "@/components/prototype/PrototypePlayer";
import { PHONE_DIMENSIONS } from "@/components/prototype/PhoneFrame";
import { PropertiesPanel } from "@/features/workspace/PropertiesPanel";
import { MLInsightPanel } from "@/features/workspace/MLInsightPanel";
import { DesignPanel } from "@/features/workspace/DesignPanel";
import { FlowGraph } from "@/features/workspace/FlowGraph";
import { RadialBackground } from "@/components/ui/light-theme-tailwind-css-background-snippet";
import type { Prototype } from "@/types/schema";

type RightTab = "properties" | "design" | "ml" | "flow";

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    current, openProject, commitPrototype, undo, redo, canUndo, canRedo,
    selectedScreenId, selectScreen, selectedComponentId, selectComponent,
    save, saving, lastSavedAt,
  } = useStore();

  const [tab, setTab] = useState<RightTab>("ml");
  const [notFound, setNotFound] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // Fit-to-viewport: the entire device must always be visible on the stage
  // (never cut off top/bottom). We measure the available stage box and scale
  // the 320x660 device down to fit, reserving room for the caption above and
  // the floating control pill below. Never scales past 1:1.
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const availH = el.clientHeight;
    const availW = el.clientWidth;
    const RESERVE_V = 188; // caption + vertical padding + control-pill zone
    const RESERVE_H = 96; // horizontal breathing + side buttons
    const s = Math.min(
      (availH - RESERVE_V) / PHONE_DIMENSIONS.HEIGHT,
      (availW - RESERVE_H) / PHONE_DIMENSIONS.WIDTH,
      1,
    );
    setFitScale(Math.max(0.45, Number.isFinite(s) ? s : 1));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, current]);

  useEffect(() => {
    if (!id) return;
    openProject(id).then((p) => setNotFound(!p));
  }, [id, openProject]);

  // keyboard shortcuts: undo/redo/save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
      else if (e.key === "s") { e.preventDefault(); save("Manual save"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-ink-muted">That project couldn't be found.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to projects</Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-morph-300 border-t-transparent" />
      </div>
    );
  }

  const proto = current.prototype;
  const activeScreenId = selectedScreenId ?? proto.navigation.entry;
  const activeIndex = Math.max(0, proto.screens.findIndex((s) => s.id === activeScreenId));
  const activeScreen = proto.screens[activeIndex] ?? proto.screens[0];
  const total = proto.screens.length;
  const goToIndex = (i: number) => {
    const s = proto.screens[i];
    if (s) selectScreen(s.id);
  };

  const apply = (next: Prototype) => commitPrototype(next);

  const togglePlatform = () =>
    commitPrototype({ ...proto, targetPlatform: proto.targetPlatform === "ios" ? "android" : "ios" });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(proto, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.name.replace(/\s+/g, "-").toLowerCase()}.morph.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    ["properties", SlidersHorizontal, "Props"],
    ["design", Palette, "Design"],
    ["ml", Brain, "ML"],
    ["flow", GitBranch, "Flow"],
  ] as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative isolate flex h-screen flex-col overflow-hidden">
      {/* Radial light backdrop spanning the whole workspace; the glass panels
          and stage let it read through. */}
      <RadialBackground />
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/40 bg-white/60 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink" aria-label="Back to projects">
            <ArrowLeft size={18} />
          </button>
          <Wordmark size="sm" to="/dashboard" />
          <span className="text-line-strong">/</span>
          <span className="text-sm font-medium text-ink">{current.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <IconBtn onClick={undo} disabled={!canUndo()} label="Undo"><Undo2 size={16} /></IconBtn>
          <IconBtn onClick={redo} disabled={!canRedo()} label="Redo"><Redo2 size={16} /></IconBtn>
          <div className="mx-1 h-5 w-px bg-line" />
          <IconBtn onClick={togglePlatform} label="Toggle device">
            <Smartphone size={16} /> <span className="text-xs">{proto.targetPlatform === "ios" ? "iOS" : "Android"}</span>
          </IconBtn>
          <IconBtn onClick={exportJson} label="Export JSON"><Download size={16} /></IconBtn>
          <Button size="sm" onClick={() => save("Manual save")} loading={saving} className="ml-1">
            {lastSavedAt && !saving ? <Check size={15} /> : <Save size={15} />}
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      </header>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {/* left: screens — no panel box; a soft outer wash fades into the stage
            so the radial backdrop reads continuously across the workspace. */}
        <aside className="flex w-60 shrink-0 flex-col bg-gradient-to-r from-white/70 via-white/35 to-transparent">
          <div className="flex items-baseline justify-between px-5 py-4">
            <span className="text-sm font-medium text-ink">Screens</span>
            <span className="font-mono text-xs text-ink-faint">{proto.screens.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {proto.screens.map((s, i) => {
              const activeScreen = activeScreenId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => selectScreen(s.id)}
                  className={[
                    "mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
                    activeScreen ? "bg-white shadow-ring" : "hover:bg-ink/[0.03]",
                  ].join(" ")}
                >
                  <span className={["font-mono text-[11px] tabular-nums", activeScreen ? "text-morph-600" : "text-ink-faint"].join(" ")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={["block truncate text-sm", activeScreen ? "font-medium text-ink" : "text-ink-soft"].join(" ")}>
                      {s.name}
                    </span>
                    <span className="block truncate text-xs capitalize text-ink-faint">{s.role}</span>
                  </span>
                  {proto.navigation.entry === s.id && (
                    <span className="shrink-0 rounded-full bg-morph-50 px-1.5 py-0.5 text-[10px] font-medium text-morph-700">start</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* center: preview — the star, on a grounded stage. */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* soft top light so the stage reads as an environment, not a flat fill */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/70 to-transparent" />

          <div ref={stageRef} className="relative flex-1 overflow-auto">
            <div className="flex min-h-full flex-col items-center justify-center gap-5 px-8 py-6">
              {/* screen caption */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="font-display text-title text-ink">{activeScreen?.name}</h2>
                  {proto.navigation.entry === activeScreen?.id && (
                    <span className="rounded-full bg-morph-50 px-2 py-0.5 text-[10px] font-medium text-morph-700">start</span>
                  )}
                </div>
                <div className="mt-1 text-xs capitalize text-ink-faint">
                  {activeScreen?.role} · {proto.targetPlatform === "ios" ? "iOS" : "Android"}
                </div>
              </div>

              {/* device on a grounded stage */}
              <div className="relative">
                <div className="pointer-events-none absolute -bottom-6 left-1/2 h-10 w-56 -translate-x-1/2 rounded-[100%] bg-ink/10 blur-2xl" />
                <PrototypePlayer
                  key={restartKey}
                  prototype={proto}
                  mode="controlled"
                  currentScreenId={activeScreenId}
                  onNavigate={selectScreen}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={selectComponent}
                  scale={fitScale}
                />
              </div>
            </div>
          </div>

          {/* floating flow controls — step through screens, restart */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-white/85 p-1 shadow-raised backdrop-blur-xl">
              <button
                onClick={() => goToIndex(activeIndex - 1)}
                disabled={activeIndex <= 0}
                aria-label="Previous screen"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[56px] text-center font-mono text-[11px] tabular-nums text-ink-muted">
                {activeIndex + 1} / {total}
              </span>
              <button
                onClick={() => goToIndex(activeIndex + 1)}
                disabled={activeIndex >= total - 1}
                aria-label="Next screen"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
              <div className="mx-1 h-4 w-px bg-line" />
              <button
                onClick={() => { setRestartKey((k) => k + 1); selectScreen(proto.navigation.entry); }}
                className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink"
              >
                <RotateCcw size={13} /> Restart
              </button>
            </div>
          </div>
        </main>

        {/* right: inspector — no panel box; outer wash fades into the stage. */}
        <aside className="flex w-80 shrink-0 flex-col bg-gradient-to-l from-white/70 via-white/35 to-transparent">
          <div className="flex shrink-0 border-b border-white/30 px-2">
            {TABS.map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={[
                  "relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-xs font-medium transition-colors",
                  tab === key ? "text-ink" : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                <Icon size={14} strokeWidth={1.75} />
                <span>{label}</span>
                {tab === key && (
                  <motion.span layoutId="inspector-tab" className="absolute -bottom-px left-0 h-px w-full bg-ink" />
                )}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "properties" && (
              <PropertiesPanel prototype={proto} selectedComponentId={selectedComponentId} onChange={apply} />
            )}
            {tab === "design" && <DesignPanel design={proto.design} />}
            {tab === "ml" && <MLInsightPanel analysis={proto.analysis} />}
            {tab === "flow" && (
              <FlowGraph prototype={proto} currentScreenId={activeScreenId} onSelect={selectScreen} />
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
