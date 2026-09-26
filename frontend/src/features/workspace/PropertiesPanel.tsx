/**
 * Properties panel — lightweight, reliable editing of the selected component.
 * Only shows controls that actually work for the component's type (no fake
 * knobs). Edits commit immutably through the store so undo/redo captures them.
 */
import type { Prototype } from "@/types/schema";
import { findComponent, updateComponent, updateComponentContent, updateComponentStyle, updateComponentAction } from "@/lib/mutate";
import { MousePointer2 } from "lucide-react";

interface Props {
  prototype: Prototype;
  selectedComponentId: string | null;
  onChange: (next: Prototype) => void;
}

const TEXTUAL = ["heading", "text", "button", "banner", "chip", "priceTag", "appbar"];
const HAS_VARIANT = ["button", "chip"];
const HAS_ALIGN = ["heading", "text"];
const NAVIGABLE = ["button", "card", "list", "searchBar"];

export function PropertiesPanel({ prototype, selectedComponentId, onChange }: Props) {
  const found = selectedComponentId ? findComponent(prototype, selectedComponentId) : undefined;

  if (!found) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink-muted">
        <MousePointer2 size={20} />
        Select any element in the preview to edit its text, style and navigation.
      </div>
    );
  }

  const { component: cmp } = found;
  const id = cmp.id;

  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="text-sm text-ink-muted">Selected element</div>
        <div className="mt-1 font-display text-title capitalize text-ink">{cmp.type}</div>
      </div>

      {TEXTUAL.includes(cmp.type) && cmp.content !== undefined && (
        <FieldGroup label="Content">
          <input
            value={cmp.content ?? ""}
            onChange={(e) => onChange(updateComponentContent(prototype, id, e.target.value))}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-morph-500"
          />
        </FieldGroup>
      )}

      {(cmp.type === "input" || cmp.type === "searchBar") && (
        <FieldGroup label="Placeholder">
          <input
            value={cmp.props?.placeholder ?? ""}
            onChange={(e) =>
              onChange(updateComponent(prototype, id, (c) => ({ ...c, props: { ...c.props, placeholder: e.target.value } })))
            }
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-morph-500"
          />
        </FieldGroup>
      )}

      {(cmp.type === "heading" || cmp.type === "text") && (
        <FieldGroup label={`Font size · ${cmp.style?.fontSize ?? (cmp.type === "heading" ? 26 : 15)}px`}>
          <input
            type="range"
            min={11}
            max={40}
            value={cmp.style?.fontSize ?? (cmp.type === "heading" ? 26 : 15)}
            onChange={(e) => onChange(updateComponentStyle(prototype, id, { fontSize: Number(e.target.value) }))}
            className="w-full accent-morph-500"
          />
        </FieldGroup>
      )}

      {HAS_ALIGN.includes(cmp.type) && (
        <FieldGroup label="Alignment">
          <Segmented
            value={cmp.style?.align ?? "left"}
            options={["left", "center", "right"]}
            onChange={(v) => onChange(updateComponentStyle(prototype, id, { align: v as any }))}
          />
        </FieldGroup>
      )}

      {(cmp.type === "heading" || cmp.type === "text") && (
        <FieldGroup label="Weight">
          <Segmented
            value={String(cmp.style?.fontWeight ?? 400)}
            options={["400", "600", "700"]}
            labels={["Regular", "Medium", "Bold"]}
            onChange={(v) => onChange(updateComponentStyle(prototype, id, { fontWeight: Number(v) }))}
          />
        </FieldGroup>
      )}

      {HAS_VARIANT.includes(cmp.type) && (
        <FieldGroup label="Style">
          <Segmented
            value={cmp.style?.variant ?? "primary"}
            options={["primary", "secondary", "ghost", "outline"]}
            onChange={(v) => onChange(updateComponentStyle(prototype, id, { variant: v as any }))}
          />
        </FieldGroup>
      )}

      {NAVIGABLE.includes(cmp.type) && (
        <FieldGroup label="On tap → navigate to">
          <select
            value={cmp.action?.type === "navigate" ? cmp.action.target ?? "" : ""}
            onChange={(e) => onChange(updateComponentAction(prototype, id, e.target.value || undefined))}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-morph-500"
          >
            <option value="">— none —</option>
            {prototype.screens
              .filter((s) => s.id !== found.screen.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </FieldGroup>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-ink-soft">{label}</div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  labels,
  onChange,
}: {
  value: string;
  options: string[];
  labels?: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={[
            "flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
            value === o ? "bg-morph-50 text-morph-700" : "text-ink-muted hover:text-ink",
          ].join(" ")}
        >
          {labels?.[i] ?? o}
        </button>
      ))}
    </div>
  );
}
