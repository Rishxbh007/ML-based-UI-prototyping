/**
 * Dashboard — "Your prototypes". A quiet editorial gallery: the real generated
 * prototype thumbnails are the subject, presented on a warm paper stage with
 * plain type beneath (no card chrome around the whole item). Create is the
 * primary action. All project wiring (seed / search / open / duplicate /
 * delete) is preserved from the store + local API.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Copy, Trash2, LayoutGrid } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/Button";
import { PrototypeThumbnail } from "@/components/prototype/PrototypeThumbnail";
import { SunnyGlowBackground } from "@/components/ui/background-components";
import { useStore } from "@/store/useStore";
import { localProjects } from "@/api/localStore";
import { buildDemoProjects } from "@/data/demos";
import type { Project } from "@/types/schema";

const SEED_FLAG = "morph.seeded.v1";

/** Seed the demo projects once so the dashboard is populated on first visit. */
function seedDemosIfNeeded() {
  if (localStorage.getItem(SEED_FLAG)) return;
  if (localProjects.list().length === 0) {
    buildDemoProjects().forEach((p) => localProjects.upsert(p));
  }
  localStorage.setItem(SEED_FLAG, "1");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projectList, loadProjects, loadingList, removeProject, duplicateProject } = useStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    seedDemosIfNeeded();
    loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projectList;
    return projectList.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [projectList, query]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative isolate min-h-screen">
      <SunnyGlowBackground />
      <TopNav />
      <main className="mx-auto max-w-content px-6 py-14">
        <div className="flex flex-col gap-6 border-b border-black/5 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-display text-ink">Your prototypes</h1>
            <p className="mt-2 text-ink-muted">
              {projectList.length} project{projectList.length === 1 ? "" : "s"}, generated from plain-English descriptions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search projects"
                className="h-10 w-48 rounded-lg border border-white/60 bg-white/50 pl-9 pr-3 text-sm text-ink outline-none backdrop-blur-md placeholder:text-ink-faint focus:border-morph-500"
              />
            </div>
            <Link to="/create">
              <Button>
                <Plus size={16} /> New prototype
              </Button>
            </Link>
          </div>
        </div>

        {loadingList && projectList.length === 0 ? (
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-white/50 bg-white/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasProjects={projectList.length > 0} />
        ) : (
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <ProjectItem
                key={p.id}
                project={p}
                delay={Math.min(i, 6) * 0.04}
                onOpen={() => navigate(`/workspace/${p.id}`)}
                onDuplicate={async () => {
                  await duplicateProject(p.id);
                }}
                onDelete={async () => {
                  if (confirm(`Delete "${p.name}"? This can't be undone.`)) await removeProject(p.id);
                }}
              />
            ))}
            <CreateTile />
          </div>
        )}
      </main>
    </motion.div>
  );
}

function ProjectItem({
  project,
  delay,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  delay: number;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const hasPrototype = (project.prototype?.screens?.length ?? 0) > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col"
    >
      <button
        onClick={onOpen}
        aria-label={`Open ${project.name}`}
        className="relative flex h-72 items-start justify-center overflow-hidden rounded-xl border border-white/50 bg-white/35 pt-7 backdrop-blur-md transition-colors group-hover:border-white/80 group-hover:bg-white/55"
      >
        {hasPrototype ? (
          <div className="translate-y-1 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5">
            <PrototypeThumbnail prototype={project.prototype} />
          </div>
        ) : (
          <div className="flex h-full items-center text-ink-faint">
            <LayoutGrid size={26} />
          </div>
        )}
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 text-left">
          <h3 className="truncate font-display text-title text-ink transition-colors group-hover:text-morph-700">
            {project.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{project.description || "No description"}</p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={onDuplicate}
            aria-label="Duplicate"
            className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Copy size={15} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
        <span>{project.targetPlatform === "ios" ? "iOS" : "Android"}</span>
        <span className="h-3 w-px bg-line" />
        <span>Edited {timeAgo(project.updatedAt)}</span>
      </div>
    </motion.div>
  );
}

function CreateTile() {
  return (
    <Link
      to="/create"
      className="group flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/15 text-ink-muted transition-colors hover:border-morph-400 hover:bg-white/30 hover:text-ink"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur transition-transform duration-300 ease-out-expo group-hover:scale-105">
        <Plus className="text-morph-600" size={20} />
      </span>
      <span className="text-sm font-medium">New prototype</span>
    </Link>
  );
}

function EmptyState({ hasProjects }: { hasProjects: boolean }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white">
        <LayoutGrid className="text-morph-600" size={24} />
      </div>
      <h2 className="font-display text-title text-ink">{hasProjects ? "No matches" : "No prototypes yet"}</h2>
      <p className="max-w-sm text-ink-muted">
        {hasProjects
          ? "Try a different search term."
          : "Describe an app in a sentence and Morph will generate a tappable prototype."}
      </p>
      {!hasProjects && (
        <Link to="/create" className="mt-1">
          <Button>
            <Plus size={16} /> Create your first prototype
          </Button>
        </Link>
      )}
    </div>
  );
}
