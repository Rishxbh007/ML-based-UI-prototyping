/**
 * Immutable helpers for editing a prototype in the workspace.
 * Every edit returns a NEW prototype object so the store's history (undo/redo)
 * captures clean snapshots.
 */
import type { Component, Prototype, Screen } from "@/types/schema";

export function findScreen(p: Prototype, screenId: string): Screen | undefined {
  return p.screens.find((s) => s.id === screenId);
}

export function findComponent(p: Prototype, componentId: string): { screen: Screen; component: Component } | undefined {
  for (const screen of p.screens) {
    const component = screen.components.find((c) => c.id === componentId);
    if (component) return { screen, component };
  }
  return undefined;
}

export function updateComponent(
  p: Prototype,
  componentId: string,
  patch: (c: Component) => Component,
): Prototype {
  return {
    ...p,
    screens: p.screens.map((s) => ({
      ...s,
      components: s.components.map((c) => (c.id === componentId ? patch(c) : c)),
    })),
  };
}

export function updateComponentContent(p: Prototype, id: string, content: string): Prototype {
  return updateComponent(p, id, (c) => ({ ...c, content }));
}

export function updateComponentStyle(
  p: Prototype,
  id: string,
  style: Partial<NonNullable<Component["style"]>>,
): Prototype {
  return updateComponent(p, id, (c) => ({ ...c, style: { ...c.style, ...style } }));
}

export function updateComponentAction(
  p: Prototype,
  id: string,
  target: string | undefined,
): Prototype {
  return updateComponent(p, id, (c) => ({
    ...c,
    action: target ? { type: "navigate", target } : { type: "none" },
  }));
}

export function renameScreen(p: Prototype, screenId: string, name: string): Prototype {
  return { ...p, screens: p.screens.map((s) => (s.id === screenId ? { ...s, name } : s)) };
}
