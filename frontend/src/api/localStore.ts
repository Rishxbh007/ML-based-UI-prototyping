/**
 * localStorage-backed project store — the offline persistence fallback.
 *
 * This is a real browser app (not a sandboxed artifact), so localStorage is an
 * appropriate, reliable place to persist projects when the backend isn't
 * running. Keeps the save/load/duplicate/delete features working during a demo
 * regardless of server state.
 */
import type { CreateProjectInput, Project, Prototype } from "@/types/schema";

const KEY = "morph.projects.v1";

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Project[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

function newId(): string {
  return "loc_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const localProjects = {
  list(): Project[] {
    return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  get(id: string): Project | null {
    return readAll().find((p) => p.id === id) ?? null;
  },

  create(input: CreateProjectInput, prototype: Prototype): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: newId(),
      name: input.name,
      description: input.description,
      targetPlatform: input.targetPlatform,
      designStyle: input.designStyle,
      targetAudience: input.targetAudience,
      createdAt: now,
      updatedAt: now,
      prototype,
    };
    const all = readAll();
    all.push(project);
    writeAll(all);
    return project;
  },

  upsert(project: Project): void {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.push(project);
    writeAll(all);
  },

  update(id: string, patch: Partial<Project>): Project | null {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
    writeAll(all);
    return all[idx];
  },

  duplicate(id: string): Project | null {
    const src = this.get(id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: Project = { ...src, id: newId(), name: `${src.name} (copy)`, createdAt: now, updatedAt: now };
    const all = readAll();
    all.push(copy);
    writeAll(all);
    return copy;
  },

  remove(id: string): void {
    writeAll(readAll().filter((p) => p.id !== id));
  },
};
