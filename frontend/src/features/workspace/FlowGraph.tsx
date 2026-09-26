/**
 * Screen-flow visualization — draws the navigation graph as nodes (screens) and
 * directed edges (navigate actions). Clicking a node selects that screen.
 * Layout is a simple deterministic grid so it stays readable for any app.
 */
import { useMemo } from "react";
import type { Prototype } from "@/types/schema";

const CELL_W = 128;
const CELL_H = 84;
const GAP_X = 56;
const GAP_Y = 44;
const COLS = 3;

export function FlowGraph({
  prototype,
  currentScreenId,
  onSelect,
}: {
  prototype: Prototype;
  currentScreenId?: string;
  onSelect: (id: string) => void;
}) {
  const { nodes, edges, width, height } = useMemo(() => {
    const nodes = prototype.screens.map((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return {
        id: s.id,
        name: s.name,
        x: col * (CELL_W + GAP_X),
        y: row * (CELL_H + GAP_Y),
      };
    });
    const pos = new Map(nodes.map((n) => [n.id, n]));
    const edges = (prototype.navigation?.edges ?? [])
      .map((e) => {
        const from = pos.get(e.from);
        const to = pos.get(e.to);
        if (!from || !to) return null;
        return { id: e.id, from, to, trigger: e.trigger };
      })
      .filter(Boolean) as Array<{ id: string; from: any; to: any; trigger: string }>;
    const rows = Math.ceil(nodes.length / COLS);
    return {
      nodes,
      edges,
      width: COLS * CELL_W + (COLS - 1) * GAP_X,
      height: rows * CELL_H + (rows - 1) * GAP_Y,
    };
  }, [prototype]);

  return (
    <div className="overflow-auto p-4">
      <div className="relative mx-auto" style={{ width, height }}>
        <svg width={width} height={height} className="absolute inset-0" style={{ overflow: "visible" }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(91,61,245,0.55)" />
            </marker>
          </defs>
          {edges.map((e) => {
            const x1 = e.from.x + CELL_W / 2;
            const y1 = e.from.y + CELL_H;
            const x2 = e.to.x + CELL_W / 2;
            const y2 = e.to.y;
            const midY = (y1 + y2) / 2;
            const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return (
              <path
                key={e.id}
                d={path}
                fill="none"
                stroke="rgba(91,61,245,0.3)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const active = n.id === currentScreenId;
          return (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={[
                "absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border px-3 text-center transition-all duration-150",
                active
                  ? "border-morph-300 bg-white text-ink shadow-soft"
                  : "border-line bg-white text-ink-soft hover:border-line-strong",
              ].join(" ")}
              style={{ left: n.x, top: n.y, width: CELL_W, height: CELL_H }}
            >
              <span className="text-xs font-medium">{n.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">
        {edges.length} connection{edges.length === 1 ? "" : "s"} · tap a screen to open it
      </p>
    </div>
  );
}
