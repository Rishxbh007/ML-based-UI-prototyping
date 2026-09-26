/**
 * Global app state (Zustand).
 *
 * Holds the project list and the currently-open project, plus a lightweight
 * prototype-history stack (undo/redo) for the workspace editor. Kept minimal
 * and flat to avoid unnecessary re-renders.
 */
import { create } from "zustand";
import type { Project, Prototype } from "@/types/schema";
import { projects as api } from "@/api/client";

const HISTORY_LIMIT = 40;

interface AppState {
  // dashboard
  projectList: Project[];
  loadingList: boolean;
  loadProjects: () => Promise<void>;

  // current project + editor
  current: Project | null;
  past: Prototype[];
  future: Prototype[];
  selectedScreenId: string | null;
  selectedComponentId: string | null;

  openProject: (id: string) => Promise<Project | null>;
  setCurrent: (project: Project) => void;
  closeProject: () => void;

  // prototype mutation with history
  commitPrototype: (next: Prototype, opts?: { record?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // selection
  selectScreen: (id: string | null) => void;
  selectComponent: (id: string | null) => void;

  // persistence
  save: (label?: string) => Promise<void>;
  saving: boolean;
  lastSavedAt: string | null;

  removeProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project | null>;
  renameProject: (id: string, name: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  projectList: [],
  loadingList: false,

  async loadProjects() {
    set({ loadingList: true });
    try {
      const list = await api.list();
      set({ projectList: list });
    } finally {
      set({ loadingList: false });
    }
  },

  current: null,
  past: [],
  future: [],
  selectedScreenId: null,
  selectedComponentId: null,

  async openProject(id) {
    const project = await api.get(id);
    if (project) get().setCurrent(project);
    return project;
  },

  setCurrent(project) {
    set({
      current: project,
      past: [],
      future: [],
      selectedScreenId: project.prototype.navigation?.entry ?? project.prototype.screens[0]?.id ?? null,
      selectedComponentId: null,
    });
  },

  closeProject() {
    set({ current: null, past: [], future: [], selectedScreenId: null, selectedComponentId: null });
  },

  commitPrototype(next, opts = { record: true }) {
    const { current, past } = get();
    if (!current) return;
    const newPast = opts.record ? [...past, current.prototype].slice(-HISTORY_LIMIT) : past;
    set({
      current: { ...current, prototype: next, updatedAt: new Date().toISOString() },
      past: newPast,
      future: [],
    });
  },

  undo() {
    const { current, past, future } = get();
    if (!current || past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      current: { ...current, prototype: prev },
      past: past.slice(0, -1),
      future: [current.prototype, ...future].slice(0, HISTORY_LIMIT),
    });
  },

  redo() {
    const { current, past, future } = get();
    if (!current || future.length === 0) return;
    const next = future[0];
    set({
      current: { ...current, prototype: next },
      past: [...past, current.prototype].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  selectScreen: (id) => set({ selectedScreenId: id, selectedComponentId: null }),
  selectComponent: (id) => set({ selectedComponentId: id }),

  saving: false,
  lastSavedAt: null,

  async save(label) {
    const { current } = get();
    if (!current) return;
    set({ saving: true });
    try {
      await api.update(current.id, {
        name: current.name,
        designStyle: current.prototype.designStyle,
        prototype: current.prototype,
        snapshotLabel: label,
      });
      set({ lastSavedAt: new Date().toISOString() });
      // refresh the list so dashboard reflects the update
      await get().loadProjects();
    } finally {
      set({ saving: false });
    }
  },

  async removeProject(id) {
    await api.remove(id);
    await get().loadProjects();
    if (get().current?.id === id) get().closeProject();
  },

  async duplicateProject(id) {
    const dup = await api.duplicate(id);
    await get().loadProjects();
    return dup;
  },

  async renameProject(id, name) {
    await api.update(id, { name });
    const { current } = get();
    if (current?.id === id) set({ current: { ...current, name } });
    await get().loadProjects();
  },
}));
