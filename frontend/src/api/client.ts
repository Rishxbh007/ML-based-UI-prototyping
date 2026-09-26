/**
 * API client with graceful offline fallback.
 *
 * Every call tries the FastAPI backend first; if the backend is unreachable it
 * transparently falls back to a local implementation (browser tokenizer for
 * analysis, a local parser for refinement, localStorage for persistence) so the
 * whole product keeps working during a demo even with no server. The `source`
 * flags in results make it honest about which path ran.
 */
import type {
  CreateProjectInput,
  Project,
  Prototype,
  RequirementAnalysis,
} from "@/types/schema";
import { analyzeLocally } from "@/lib/localAnalysis";
import { parseRefinementLocally, type RefinementCommand } from "@/lib/refine";
import { localProjects } from "@/api/localStore";
import type { AppContent } from "@/lib/content";
import type { ScreenRole } from "@/types/schema";
import type { StructurePlan } from "@/lib/designIntelligence";
import { uid } from "@/lib/ids";

const API = "/api";
const TIMEOUT_MS = 6000;

async function req<T>(path: string, init?: RequestInit, timeoutMs: number = TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API + path, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new ApiError(res.status, detail?.detail ?? res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Cache backend availability for a short window to avoid probing every call.
let _online: boolean | null = null;
let _checkedAt = 0;
export async function backendOnline(): Promise<boolean> {
  const now = Date.now();
  if (_online !== null && now - _checkedAt < 10_000) return _online;
  try {
    await req("/health");
    _online = true;
  } catch {
    _online = false;
  }
  _checkedAt = now;
  return _online;
}

// -------------------------------------------------------------------------
// Analysis
// -------------------------------------------------------------------------
export interface AnalyzeResult {
  analysis: RequirementAnalysis;
  usedBackend: boolean;
}

export async function analyze(description: string): Promise<AnalyzeResult> {
  if (await backendOnline()) {
    try {
      const analysis = await req<RequirementAnalysis>("/analyze", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      return { analysis, usedBackend: true };
    } catch {
      /* fall through to local */
    }
  }
  return { analysis: analyzeLocally(description), usedBackend: false };
}

// -------------------------------------------------------------------------
// ML introspection (insight panel)
// -------------------------------------------------------------------------
export async function mlMetrics(): Promise<unknown | null> {
  try {
    return await req("/ml/metrics");
  } catch {
    return null;
  }
}

export async function mlStatus(): Promise<{ trained: boolean; available: boolean }> {
  try {
    return await req("/ml/status");
  } catch {
    return { trained: false, available: false };
  }
}

// -------------------------------------------------------------------------
// Refinement parsing
// -------------------------------------------------------------------------
export async function refineParse(
  instruction: string,
  ctx: { appType?: string; screenRoles?: string[] },
): Promise<RefinementCommand> {
  if (await backendOnline()) {
    try {
      return await req<RefinementCommand>("/refine/parse", {
        method: "POST",
        body: JSON.stringify({
          instruction,
          app_type: ctx.appType,
          screen_roles: ctx.screenRoles ?? [],
        }),
      });
    } catch {
      /* fall through */
    }
  }
  return parseRefinementLocally(instruction);
}

// -------------------------------------------------------------------------
// Per-request content (hybrid "smart tier")
// -------------------------------------------------------------------------
// The backend LLM authors request-specific screen content; if it's disabled or
// unreachable we return null and the caller falls back to the built-in library
// (contentFor). Backend items/reviews carry no ids/tones — we assign them here
// exactly like the library does, so tone styling and keys stay stable.
const _TONES = ["morph", "cyan", "sky", "amber", "rose", "emerald", "violet", "slate"];

interface BackendItem {
  title: string;
  subtitle?: string | null;
  trailing?: string | null;
  price?: string | null;
  rating?: number | null;
  icon?: string | null;
}
interface BackendReview { author: string; text: string; rating: number }
interface BackendContent {
  categories: string[];
  primary_list: BackendItem[];
  detail_title: string;
  detail_subtitle: string;
  detail_body: string;
  detail_highlights: string[];
  detail_price?: string | null;
  reviews: BackendReview[];
  tracking_eta?: string | null;
  tracking_note?: string | null;
  nav_tabs: string[];
  hero_title: string;
  hero_subtitle: string;
}
interface GenerateContentResponse {
  content: BackendContent | null;
  source: "llm" | "fallback";
  note: string;
}

function undef<T>(v: T | null | undefined): T | undefined {
  return v == null ? undefined : v;
}

function toAppContent(b: BackendContent): AppContent {
  return {
    categories: b.categories ?? [],
    primaryList: (b.primary_list ?? []).map((it, i) => ({
      id: uid("it"),
      title: it.title,
      subtitle: undef(it.subtitle),
      trailing: undef(it.trailing),
      price: undef(it.price),
      rating: undef(it.rating),
      icon: undef(it.icon),
      image: _TONES[i % _TONES.length],
    })),
    detailTitle: b.detail_title ?? "",
    detailSubtitle: b.detail_subtitle ?? "",
    detailBody: b.detail_body ?? "",
    detailHighlights: b.detail_highlights ?? [],
    detailPrice: undef(b.detail_price),
    reviews: (b.reviews ?? []).map((r) => ({ id: uid("r"), author: r.author, text: r.text, rating: r.rating })),
    trackingEta: undef(b.tracking_eta),
    trackingNote: undef(b.tracking_note),
    navTabs: b.nav_tabs ?? [],
    heroTitle: b.hero_title ?? "",
    heroSubtitle: b.hero_subtitle ?? "",
  };
}

export async function generateContent(
  ctx: { appType: string; appName: string; description: string; features: string[] },
): Promise<AppContent | null> {
  if (!(await backendOnline())) {
    console.info("[Morph] content: backend offline → built-in library");
    return null;
  }
  try {
    const wantsTracking = ctx.appType === "food-delivery" || ctx.appType === "ecommerce";
    const res = await req<GenerateContentResponse>("/generate/content", {
      method: "POST",
      body: JSON.stringify({
        app_type: ctx.appType,
        app_name: ctx.appName,
        description: ctx.description,
        features: ctx.features,
        wants_reviews: true,
        wants_tracking: wantsTracking,
      }),
    }, 30_000); // LLM authoring legitimately takes longer than the 6s default
    console.info(`[Morph] content: source=${res.source} — ${res.note}`);
    if (res.source === "llm" && res.content) return toAppContent(res.content);
  } catch (err) {
    console.info("[Morph] content: request failed → built-in library", err);
  }
  return null;
}

// -------------------------------------------------------------------------
// Per-request structure (Phase 2 — "LLM-assisted structure")
// -------------------------------------------------------------------------
// The backend LLM proposes which screens the described app needs (chosen only
// from the role vocabulary we pass in); if it's disabled or unreachable we
// return null and the caller's deriveDesignSpec falls back to its deterministic
// requirement-driven selection. Roles are re-validated here (never trust the
// wire) so the generator only ever receives known ScreenRoles.
interface StructureResponse {
  structure: { roles: string[]; primary: string[]; rationale: string } | null;
  source: "llm" | "fallback";
  note: string;
}

/**
 * The outcome of a structure request, carrying enough provenance for the
 * (dev-only) Phase 2 diagnostic WITHOUT leaking prompt text or secrets:
 *   - `plan`          — the validated StructurePlan handed to generate() (or null
 *                       when the LLM was off/unreachable/returned nothing usable);
 *   - `proposedRoles` — the RAW roles the LLM proposed, exactly as received and
 *                       BEFORE the allowed-vocabulary filter below (so a diagnostic
 *                       can see what validation later dropped). [] on the fallback path.
 *   - `source`        — "llm" when the model authored the structure, else "fallback".
 */
export interface StructureOutcome {
  plan: StructurePlan | null;
  proposedRoles: string[];
  source: "llm" | "fallback";
  note: string;
}

export async function generateStructure(
  ctx: {
    appType: string;
    appName: string;
    description: string;
    features: string[];
    candidateRoles: ScreenRole[];
    allowedRoles: ScreenRole[];
  },
): Promise<StructureOutcome> {
  if (!(await backendOnline())) {
    console.info("[Morph] structure: backend offline → deterministic selection");
    return { plan: null, proposedRoles: [], source: "fallback", note: "backend offline" };
  }
  try {
    const res = await req<StructureResponse>("/generate/structure", {
      method: "POST",
      body: JSON.stringify({
        app_type: ctx.appType,
        app_name: ctx.appName,
        description: ctx.description,
        features: ctx.features,
        candidate_roles: ctx.candidateRoles,
        allowed_roles: ctx.allowedRoles,
      }),
    }, 30_000);
    console.info(`[Morph] structure: source=${res.source} — ${res.note}`);
    // The raw proposal, captured BEFORE validation so the diagnostic can show
    // exactly what the model asked for (and therefore what validation removed).
    const proposedRoles = res.structure?.roles ?? [];
    if (res.source === "llm" && res.structure) {
      const allowed = new Set<string>(ctx.allowedRoles);
      const roles = res.structure.roles.filter((r): r is ScreenRole => allowed.has(r));
      const primary = res.structure.primary.filter((r): r is ScreenRole => allowed.has(r));
      if (roles.length > 0) {
        return { plan: { roles, primary }, proposedRoles, source: "llm", note: res.note };
      }
    }
    return { plan: null, proposedRoles, source: res.source, note: res.note };
  } catch (err) {
    console.info("[Morph] structure: request failed → deterministic selection", err);
  }
  return { plan: null, proposedRoles: [], source: "fallback", note: "request failed" };
}

// -------------------------------------------------------------------------
// Projects (backend when available, else localStorage)
// -------------------------------------------------------------------------
export const projects = {
  async list(): Promise<Project[]> {
    if (await backendOnline()) {
      try {
        // backend returns summaries; we hydrate full projects lazily on open,
        // but for the dashboard we keep the local copies in sync too.
        const summaries = await req<any[]>("/projects");
        // merge: prefer backend list, fall back to local cache for prototypes
        const cached = localProjects.list();
        return summaries.map((s) => {
          const full = cached.find((c) => c.id === s.id);
          return (
            full ?? {
              ...s,
              targetPlatform: s.target_platform,
              designStyle: s.design_style,
              createdAt: s.updated_at,
              updatedAt: s.updated_at,
              prototype: { screens: [] } as unknown as Prototype,
            }
          );
        });
      } catch {
        /* fall through */
      }
    }
    return localProjects.list();
  },

  async get(id: string): Promise<Project | null> {
    if (await backendOnline()) {
      try {
        const p = await req<any>(`/projects/${id}`);
        return fromBackend(p);
      } catch {
        /* fall through */
      }
    }
    return localProjects.get(id);
  },

  async create(input: CreateProjectInput, prototype: Prototype): Promise<Project> {
    const local = localProjects.create(input, prototype);
    if (await backendOnline()) {
      try {
        const p = await req<any>("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            description: input.description,
            target_platform: input.targetPlatform,
            design_style: input.designStyle,
            target_audience: input.targetAudience ?? "",
            prototype,
          }),
        });
        // adopt the backend id so both stores agree
        localProjects.remove(local.id);
        const synced = fromBackend(p);
        localProjects.upsert(synced);
        return synced;
      } catch {
        /* keep local */
      }
    }
    return local;
  },

  async update(id: string, patch: Partial<Project> & { snapshotLabel?: string }): Promise<Project | null> {
    const updated = localProjects.update(id, patch);
    if (await backendOnline()) {
      try {
        await req(`/projects/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: patch.name,
            description: patch.description,
            design_style: patch.designStyle,
            prototype: patch.prototype,
            snapshot_label: patch.snapshotLabel,
          }),
        });
      } catch {
        /* keep local */
      }
    }
    return updated;
  },

  async duplicate(id: string): Promise<Project | null> {
    const dup = localProjects.duplicate(id);
    return dup;
  },

  async remove(id: string): Promise<void> {
    localProjects.remove(id);
    if (await backendOnline()) {
      try {
        await req(`/projects/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
    }
  },
};

function fromBackend(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    targetPlatform: p.target_platform,
    designStyle: p.design_style,
    targetAudience: p.target_audience,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    prototype: p.prototype,
  };
}
