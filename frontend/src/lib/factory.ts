/**
 * Component factory helpers.
 *
 * Small, composable builders that produce schema `Component` objects. Screen
 * builders (screens.ts) assemble these into full screens. Keeping construction
 * here means the schema stays consistent and screens stay readable.
 */
import type {
  Component,
  ComponentAction,
  ComponentProps,
  ComponentStyle,
  ComponentType,
} from "@/types/schema";
import { uid } from "./ids";

function make(
  type: ComponentType,
  content?: string,
  opts: { style?: ComponentStyle; props?: ComponentProps; action?: ComponentAction } = {},
): Component {
  return { id: uid(type), type, content, ...opts };
}

export const c = {
  appbar: (title: string, opts: { back?: boolean; trailingIcon?: string } = {}) =>
    make("appbar", title, {
      props: { icon: opts.trailingIcon },
      action: opts.back ? { type: "back" } : undefined,
      style: { align: "center" },
    }),

  /** Heading. By default inherits the theme's `typography.heading` token (the
   *  phone-appropriate section-title size). Pass `{ display: true }` for a hero /
   *  landmark heading that inherits the larger `typography.display` token. Both
   *  scales come from the design system, so no screen hardcodes a pixel size. */
  heading: (text: string, opts: { display?: boolean } = {}) =>
    make("heading", text, { style: { scale: opts.display ? "display" : "heading" } }),

  text: (text: string, opts: { muted?: boolean; size?: number; align?: ComponentStyle["align"] } = {}) =>
    make("text", text, {
      style: { fontSize: opts.size ?? 15, color: opts.muted ? "muted" : undefined, align: opts.align },
    }),

  button: (
    text: string,
    action?: ComponentAction,
    opts: { variant?: ComponentStyle["variant"]; fullWidth?: boolean; icon?: string } = {},
  ) =>
    make("button", text, {
      style: { variant: opts.variant ?? "primary", fullWidth: opts.fullWidth ?? true },
      props: { icon: opts.icon },
      action: action ?? { type: "none" },
    }),

  input: (placeholder: string, opts: { icon?: string; value?: string } = {}) =>
    make("input", undefined, { props: { placeholder, icon: opts.icon, value: opts.value } }),

  searchBar: (placeholder = "Search") =>
    make("searchBar", undefined, { props: { placeholder, icon: "search" } }),

  image: (opts: { tone?: string; height?: number } = {}) =>
    make("image", undefined, { props: { imageTone: opts.tone }, style: { height: opts.height ?? 160 } }),

  avatar: (label?: string) => make("avatar", label, {}),

  divider: () => make("divider"),
  spacer: (h = 12) => make("spacer", undefined, { style: { height: h } }),

  chip: (text: string, opts: { active?: boolean } = {}) =>
    make("chip", text, { style: { variant: opts.active ? "primary" : "outline" } }),

  /** A horizontal row of category/filter chips. Replaces the old pattern of
   *  rendering categories as a list of cards with empty gradient thumbnails. */
  chipRow: (chips: string[], opts: { active?: number } = {}) =>
    make("chipRow", undefined, { props: { chips, activeChip: opts.active ?? 0 } }),

  /** Hero balance/metric card for finance & dashboard homes. `content` is the
   *  big value; `label` is the caption above it; `trailing` an optional delta. */
  balanceCard: (value: string, opts: { label?: string; trailing?: string; tone?: string } = {}) =>
    make("balanceCard", value, {
      props: { label: opts.label, statValue: opts.trailing, imageTone: opts.tone },
    }),

  toggle: (label: string, checked = false) =>
    make("toggle", undefined, { props: { label, checked } }),

  stat: (statLabel: string, statValue: string) =>
    make("stat", undefined, { props: { statLabel, statValue } }),

  progress: (label: string, value: number) =>
    make("progress", undefined, { props: { label, progress: value } }),

  banner: (title: string, opts: { tone?: string } = {}) =>
    make("banner", title, { props: { imageTone: opts.tone } }),

  priceTag: (price: string) => make("priceTag", price),
  ratingStars: (rating: number) => make("ratingStars", undefined, { props: { rating } }),

  card: (
    content: string,
    opts: { subtitle?: string; tone?: string; action?: ComponentAction } = {},
  ) =>
    make("card", content, {
      props: {
        imageTone: opts.tone,
        items: opts.subtitle ? [{ id: uid("c"), title: opts.subtitle }] : undefined,
      },
      action: opts.action,
    }),

  list: (
    items: NonNullable<ComponentProps["items"]>,
    opts: { columns?: number; action?: ComponentAction } = {},
  ) =>
    make("list", undefined, { props: { items, columns: opts.columns ?? 1 }, action: opts.action }),

  tabBar: (tabs: string[], active = 0) =>
    make("tabBar", undefined, { props: { tabs, activeTab: active } }),

  bottomNav: (tabs: string[], active = 0) =>
    make("bottomNav", undefined, { props: { tabs, activeTab: active } }),
};
