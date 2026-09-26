/**
 * Renders ONE schema Component into a real DOM node styled by the prototype's
 * DesignTokens. The renderer is generic — it switches on component.type and
 * knows nothing about specific apps. Interactive components call `onAction`.
 */
import type { CSSProperties } from "react";
import type { Component, ComponentAction, DesignTokens } from "@/types/schema";
import { Icon, tabIcon } from "./Icon";

const TONES: Record<string, string> = {
  morph: "linear-gradient(135deg,#6E38F5,#38E1D6)",
  cyan: "linear-gradient(135deg,#17C4C4,#38E1D6)",
  sky: "linear-gradient(135deg,#3B82F6,#22D3EE)",
  amber: "linear-gradient(135deg,#F59E0B,#FB7185)",
  rose: "linear-gradient(135deg,#FB7185,#F43F5E)",
  emerald: "linear-gradient(135deg,#10B981,#34D399)",
  violet: "linear-gradient(135deg,#8B5CF6,#6E38F5)",
  slate: "linear-gradient(135deg,#64748B,#475569)",
};
const toneBg = (t?: string) => (t && TONES[t]) || TONES.morph;

/** Elevation per the token's `shadow` level. Keeps cards feeling distinct
 *  across domains (flat finance vs. lifted commerce) without per-screen hex. */
const SHADOWS: Record<DesignTokens["shadow"], string> = {
  none: "none",
  soft: "0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
  medium: "0 2px 6px rgba(0,0,0,0.06), 0 6px 16px -8px rgba(0,0,0,0.12)",
  strong: "0 8px 24px -10px rgba(0,0,0,0.35)",
};

/** Card surface styling derived from the token's `cardStyle`. */
function cardSurface(t: DesignTokens) {
  const base = { borderRadius: t.radius, background: t.colors.surface };
  switch (t.cardStyle) {
    case "outlined":
      return { ...base, border: `1px solid ${t.colors.border}`, boxShadow: "none" };
    case "elevated":
      return { ...base, border: `1px solid ${t.colors.border}`, boxShadow: SHADOWS[t.shadow] };
    case "filled":
      return { ...base, background: t.colors.surfaceAlt, border: "1px solid transparent", boxShadow: "none" };
  }
}

interface Props {
  component: Component;
  tokens: DesignTokens;
  onAction: (action?: ComponentAction, meta?: { tabIndex?: number }) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function ComponentRenderer({ component: cmp, tokens, onAction, selected, onSelect }: Props) {
  const t = tokens;
  const s = cmp.style ?? {};
  const p = cmp.props ?? {};

  const resolveColor = (c?: string) => {
    if (!c) return undefined;
    if (c === "muted") return t.colors.textMuted;
    if (c === "primary") return t.colors.primary;
    if (c === "text") return t.colors.text;
    return c;
  };

  const clickable = cmp.action && cmp.action.type !== "none";
  const handleClick = () => {
    if (onSelect) onSelect(cmp.id);
    if (clickable) onAction(cmp.action);
  };

  const space = (n: number) => n * t.spacingUnit;
  const selRing = selected ? { outline: `2px solid ${t.colors.accent}`, outlineOffset: 2 } : {};

  switch (cmp.type) {
    case "appbar":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space(1.5)}px 0`, ...selRing }} onClick={() => onSelect?.(cmp.id)}>
          <div style={{ width: 32 }}>
            {cmp.action?.type === "back" && (
              // 44x44 touch target (skill: Touch Target Size); negative margins
              // expand the hit area without shifting the icon or the title's centering.
              <button aria-label="Back" onClick={(e) => { e.stopPropagation(); onAction(cmp.action); }} style={{ background: "none", border: "none", cursor: "pointer", color: t.colors.text, display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, margin: "-11px 0 -11px -11px" }}>
                <Icon name="arrow-left" size={22} color={t.colors.text} />
              </button>
            )}
          </div>
          <div style={{ fontFamily: t.typography.fontFamily, fontWeight: 600, fontSize: t.typography.subheading, color: t.colors.text }}>
            {cmp.content}
          </div>
          <div style={{ width: 32, textAlign: "right" }}>
            {p.icon && <Icon name={p.icon} size={20} color={t.colors.text} />}
          </div>
        </div>
      );

    case "heading": {
      // size comes from the design token the factory chose (display vs heading),
      // never a per-screen magic number; an explicit fontSize still wins if set.
      const headingSize = s.fontSize ?? (s.scale === "display" ? t.typography.display : t.typography.heading);
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ fontFamily: t.typography.fontFamily, fontSize: headingSize, fontWeight: s.fontWeight ?? t.typography.headingWeight, color: resolveColor(s.color) ?? t.colors.text, textAlign: s.align ?? "left", lineHeight: 1.15, ...selRing }}>
          {cmp.content}
        </div>
      );
    }

    case "text":
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ fontFamily: t.typography.fontFamily, fontSize: s.fontSize ?? t.typography.body, fontWeight: s.fontWeight ?? t.typography.bodyWeight, color: resolveColor(s.color) ?? t.colors.text, textAlign: s.align ?? "left", lineHeight: 1.5, ...selRing }}>
          {cmp.content}
        </div>
      );

    case "button": {
      const variant = s.variant ?? "primary";
      const styleByVariant: Record<string, CSSProperties> = {
        primary: { background: t.colors.primary, color: t.colors.primaryText },
        secondary: { background: t.colors.surfaceAlt, color: t.colors.text },
        ghost: { background: "transparent", color: t.colors.primary },
        outline: { background: "transparent", color: t.colors.text, border: `1px solid ${t.colors.border}` },
      };
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          style={{
            width: s.fullWidth === false ? "auto" : "100%",
            height: 48, borderRadius: t.radius, border: "none", cursor: "pointer",
            fontFamily: t.typography.fontFamily, fontSize: 15, fontWeight: 600,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "transform .1s ease, filter .2s ease",
            ...styleByVariant[variant], ...selRing,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {p.icon && <Icon name={p.icon} size={18} color={styleByVariant[variant].color as string} />}
          {cmp.content}
        </button>
      );
    }

    case "input":
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: `0 ${space(1.75)}px`, background: t.colors.surface, border: `1px solid ${t.colors.border}`, borderRadius: t.radius, ...selRing }}>
          {p.icon && <Icon name={p.icon} size={18} color={t.colors.textMuted} />}
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.body, color: p.value ? t.colors.text : t.colors.textMuted }}>
            {p.value ?? p.placeholder}
          </span>
        </div>
      );

    case "searchBar":
      return (
        <div onClick={() => { onSelect?.(cmp.id); handleClick(); }} style={{ display: "flex", alignItems: "center", gap: 10, height: 46, padding: `0 ${space(1.75)}px`, background: t.colors.surfaceAlt, borderRadius: 999, cursor: clickable ? "pointer" : "default", ...selRing }}>
          <Icon name="search" size={18} color={t.colors.textMuted} />
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.body, color: t.colors.textMuted }}>{p.placeholder}</span>
        </div>
      );

    case "image":
      return <div onClick={() => onSelect?.(cmp.id)} style={{ height: s.height ?? 160, borderRadius: t.radius, background: toneBg(p.imageTone), ...selRing }} />;

    case "banner":
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ minHeight: 96, borderRadius: t.radius, background: toneBg(p.imageTone), display: "flex", alignItems: "center", justifyContent: "center", padding: space(2), ...selRing }}>
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: 22, fontWeight: 700, color: "#fff", textAlign: "center" }}>{cmp.content}</span>
        </div>
      );

    case "avatar":
      return (
        <div style={{ display: "flex", justifyContent: "center", ...selRing }} onClick={() => onSelect?.(cmp.id)}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: toneBg("morph"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 26, fontFamily: t.typography.fontFamily }}>
            {cmp.content ?? "A"}
          </div>
        </div>
      );

    case "chip":
      return (
        <span onClick={() => onSelect?.(cmp.id)} style={{ display: "inline-flex", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: t.typography.fontFamily, background: s.variant === "primary" ? t.colors.primary : t.colors.surfaceAlt, color: s.variant === "primary" ? t.colors.primaryText : t.colors.text, ...selRing }}>
          {cmp.content}
        </span>
      );

    case "divider":
      return <div style={{ height: 1, background: t.colors.border, margin: `${space(1)}px 0` }} />;

    case "spacer":
      return <div style={{ height: s.height ?? 12 }} />;

    case "toggle":
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space(1.25)}px 0`, ...selRing }}>
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.body, color: t.colors.text }}>{p.label}</span>
          <div style={{ width: 44, height: 26, borderRadius: 999, background: p.checked ? t.colors.primary : t.colors.border, position: "relative", transition: "background .2s" }}>
            <div style={{ position: "absolute", top: 3, left: p.checked ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
          </div>
        </div>
      );

    case "stat":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space(0.75)}px 0` }}>
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.body, color: t.colors.textMuted }}>{p.statLabel}</span>
          <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.subheading, fontWeight: 700, color: t.colors.text }}>{p.statValue}</span>
        </div>
      );

    case "progress":
      return (
        <div style={{ padding: `${space(0.5)}px 0` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.caption, color: t.colors.textMuted }}>{p.label}</span>
            <span style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.caption, color: t.colors.text }}>{p.progress}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: t.colors.surfaceAlt }}>
            <div style={{ width: `${p.progress ?? 0}%`, height: "100%", borderRadius: 999, background: t.colors.primary }} />
          </div>
        </div>
      );

    case "priceTag":
      return <div style={{ fontFamily: t.typography.fontFamily, fontSize: 24, fontWeight: 800, color: t.colors.primary }}>{cmp.content}</div>;

    case "ratingStars": {
      const r = Math.round(p.rating ?? 0);
      return (
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={16} color={i < r ? t.colors.accent : t.colors.border} />)}
          <span style={{ marginLeft: 6, fontSize: 13, color: t.colors.textMuted, fontFamily: t.typography.fontFamily }}>{p.rating?.toFixed(1)}</span>
        </div>
      );
    }

    case "list": {
      const cols = p.columns ?? 1;
      const items = p.items ?? [];
      // Empty state (skill rule "Empty States": never a blank area — guide the user).
      if (items.length === 0) {
        return (
          <div style={{ ...cardSurface(t), padding: space(3), textAlign: "center", ...selRing }}>
            <Icon name="inbox" size={26} color={t.colors.textMuted} />
            <div style={{ marginTop: 8, fontFamily: t.typography.fontFamily, fontSize: t.typography.body, fontWeight: 600, color: t.colors.text }}>Nothing here yet</div>
            <div style={{ marginTop: 2, fontFamily: t.typography.fontFamily, fontSize: t.typography.caption, color: t.colors.textMuted }}>New items will show up here.</div>
          </div>
        );
      }
      const twoCol = cols >= 2;
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: space(1.25), ...selRing }}>
          {items.map((it) => {
            // Single-column rows with a named icon (task lists, tracking steps,
            // profile/settings rows) render a tinted icon chip instead of a
            // gradient photo thumbnail, which reads wrong for non-visual items.
            const thumb =
              it.icon && !twoCol ? (
                <div style={{ width: 46, height: 46, borderRadius: t.radius - 4, background: t.colors.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={it.icon} size={20} color={t.colors.primary} />
                </div>
              ) : (
                <div style={{ width: twoCol ? "100%" : 46, height: twoCol ? 100 : 46, borderRadius: t.radius - 4, background: toneBg(it.image), flexShrink: 0 }} />
              );
            return (
              <div key={it.id} onClick={(e) => { e.stopPropagation(); if (clickable) onAction(cmp.action); }}
                style={{ display: "flex", flexDirection: twoCol ? "column" : "row", gap: twoCol ? 8 : 12, alignItems: twoCol ? "stretch" : "center", padding: space(1.5), minWidth: 0, boxSizing: "border-box", cursor: clickable ? "pointer" : "default", ...cardSurface(t) }}>
                {thumb}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.body, fontWeight: 600, color: t.colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                  {it.subtitle && <div style={{ fontSize: t.typography.caption, color: t.colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.subtitle}</div>}
                </div>
                {(it.price || it.trailing) && <span style={{ flexShrink: 0, fontSize: t.typography.caption, fontWeight: 700, color: it.price ? t.colors.primary : t.colors.textMuted, whiteSpace: "nowrap" }}>{it.price ?? it.trailing}</span>}
              </div>
            );
          })}
        </div>
      );
    }

    case "card":
      return (
        <div onClick={() => { onSelect?.(cmp.id); if (clickable) onAction(cmp.action); }} style={{ padding: space(2), cursor: clickable ? "pointer" : "default", ...cardSurface(t), ...selRing }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: t.radius - 4, background: toneBg(p.imageTone), flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: t.typography.fontFamily, fontWeight: 600, fontSize: t.typography.body, color: t.colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cmp.content}</div>
              {p.items?.[0]?.title && <div style={{ fontSize: t.typography.caption, color: t.colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.items[0].title}</div>}
            </div>
          </div>
        </div>
      );

    case "chipRow": {
      // Horizontal category/filter chips. They may exceed the frame width, so
      // the row scrolls horizontally and each chip is nowrap (skill: "Chip
      // Collection Reflow" — never clip labels; keep them on one scannable line).
      const chips = p.chips ?? [];
      const active = p.activeChip ?? 0;
      return (
        <div onClick={() => onSelect?.(cmp.id)} className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, ...selRing }}>
          {chips.map((chip, i) => {
            const on = i === active;
            return (
              <span key={chip} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 999, fontSize: t.typography.caption, fontWeight: 600, whiteSpace: "nowrap", fontFamily: t.typography.fontFamily, background: on ? t.colors.primary : t.colors.surfaceAlt, color: on ? t.colors.primaryText : t.colors.text, border: on ? "1px solid transparent" : `1px solid ${t.colors.border}` }}>
                {chip}
              </span>
            );
          })}
        </div>
      );
    }

    case "balanceCard": {
      // Hero metric card (finance/dashboard). Big value, small label, optional
      // trailing delta. Uses the primary color as a filled surface for emphasis.
      return (
        <div onClick={() => onSelect?.(cmp.id)} style={{ padding: space(2.5), borderRadius: t.radius, background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`, boxShadow: SHADOWS[t.shadow], ...selRing }}>
          {p.label && <div style={{ fontFamily: t.typography.fontFamily, fontSize: t.typography.caption, color: t.colors.primaryText, opacity: 0.8 }}>{p.label}</div>}
          <div style={{ marginTop: 4, fontFamily: t.typography.fontFamily, fontSize: t.typography.display, fontWeight: 800, color: t.colors.primaryText, lineHeight: 1.1 }}>{cmp.content}</div>
          {p.statValue && <div style={{ marginTop: 6, fontFamily: t.typography.fontFamily, fontSize: t.typography.caption, fontWeight: 600, color: t.colors.primaryText, opacity: 0.9 }}>{p.statValue}</div>}
        </div>
      );
    }

    case "tabBar":
      return (
        <div style={{ display: "flex", gap: 4, padding: 4, background: t.colors.surfaceAlt, borderRadius: 999 }}>
          {(p.tabs ?? []).map((tab, i) => (
            <div key={tab} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: t.typography.fontFamily, background: i === (p.activeTab ?? 0) ? t.colors.background : "transparent", color: i === (p.activeTab ?? 0) ? t.colors.text : t.colors.textMuted }}>
              {tab}
            </div>
          ))}
        </div>
      );

    case "bottomNav": {
      // Positioning is owned by PhoneFrame's pinned bottomBar slot; this renders
      // as a static bar. Tabs are ≥44px touch targets (skill: Touch Target Size).
      const targets = p.targets;
      return (
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: 62, paddingBottom: 4, background: t.colors.surface, borderTop: `1px solid ${t.colors.border}`, boxShadow: "0 -6px 20px -12px rgba(0,0,0,0.25)" }}>
          {(p.tabs ?? []).map((tab, i) => {
            const active = i === (p.activeTab ?? 0);
            return (
              <button key={tab} aria-label={tab} aria-current={active ? "page" : undefined} onClick={(e) => { e.stopPropagation(); const target = targets?.[i]; if (target) onAction({ type: "navigate", target }); }}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minWidth: 44, minHeight: 44, color: active ? t.colors.primary : t.colors.textMuted }}>
                <Icon name={tabIcon(tab)} size={21} color={active ? t.colors.primary : t.colors.textMuted} />
                <span style={{ fontSize: 10, fontFamily: t.typography.fontFamily, fontWeight: active ? 700 : 500 }}>{tab}</span>
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}
