/**
 * Interactive prototype player.
 *
 * Renders a Prototype inside a PhoneFrame and executes navigation actions
 * (navigate / back / restart) via a real navigation stack, with animated
 * screen transitions. Works in two modes:
 *   - "play": self-contained navigation (landing hero, dashboard preview)
 *   - "controlled": the current screen is driven from outside (workspace, where
 *     the left panel selects screens); navigation calls `onNavigate`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ComponentAction, Prototype, Screen } from "@/types/schema";
import { PhoneFrame } from "./PhoneFrame";
import { ComponentRenderer } from "./ComponentRenderer";

interface Props {
  prototype: Prototype;
  scale?: number;
  mode?: "play" | "controlled";
  currentScreenId?: string;
  onNavigate?: (screenId: string) => void;
  selectedComponentId?: string | null;
  onSelectComponent?: (id: string) => void;
}

export function PrototypePlayer({
  prototype,
  scale = 1,
  mode = "play",
  currentScreenId,
  onNavigate,
  selectedComponentId,
  onSelectComponent,
}: Props) {
  const screensById = useMemo(() => {
    const m = new Map<string, Screen>();
    prototype.screens.forEach((s) => m.set(s.id, s));
    return m;
  }, [prototype]);

  const entry = prototype.navigation?.entry ?? prototype.screens[0]?.id;
  const [stack, setStack] = useState<string[]>([entry]);
  const [dir, setDir] = useState<1 | -1>(1);
  const lastControlled = useRef(currentScreenId);

  // In controlled mode the active screen comes from props; sync the stack so
  // "back" still works after external screen selection.
  useEffect(() => {
    if (mode === "controlled" && currentScreenId && currentScreenId !== lastControlled.current) {
      setDir(1);
      setStack((prev) => (prev[prev.length - 1] === currentScreenId ? prev : [...prev, currentScreenId]));
      lastControlled.current = currentScreenId;
    }
  }, [currentScreenId, mode]);

  const activeId = mode === "controlled" ? currentScreenId ?? entry : stack[stack.length - 1];
  const screen = activeId ? screensById.get(activeId) : undefined;

  const go = useCallback(
    (id: string) => {
      setDir(1);
      if (mode === "controlled") {
        lastControlled.current = id;
        onNavigate?.(id);
        setStack((prev) => [...prev, id]);
      } else {
        setStack((prev) => [...prev, id]);
      }
    },
    [mode, onNavigate],
  );

  const back = useCallback(() => {
    setDir(-1);
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const target = next[next.length - 1];
      if (mode === "controlled") {
        lastControlled.current = target;
        onNavigate?.(target);
      }
      return next;
    });
  }, [mode, onNavigate]);

  const restart = useCallback(() => {
    setDir(-1);
    setStack([entry]);
    if (mode === "controlled") {
      lastControlled.current = entry;
      onNavigate?.(entry);
    }
  }, [entry, mode, onNavigate]);

  const handleAction = useCallback(
    (action?: ComponentAction) => {
      if (!action) return;
      switch (action.type) {
        case "navigate":
          if (action.target && screensById.has(action.target)) go(action.target);
          break;
        case "back":
          back();
          break;
        case "restart":
          restart();
          break;
        default:
          break; // toggle/submit/none are visual-only in the player
      }
    },
    [go, back, restart, screensById],
  );

  if (!screen) {
    return (
      <PhoneFrame platform={prototype.targetPlatform} tokens={prototype.tokens} scale={scale}>
        <div style={{ padding: 24, color: prototype.tokens.colors.textMuted }}>No screen to display.</div>
      </PhoneFrame>
    );
  }

  const pad = prototype.tokens.spacingUnit * 2.5;

  // Separate the bottom navigation from the flowing content: the nav must be
  // pinned to the phone frame (not scroll with content), so it goes into the
  // PhoneFrame's dedicated bottomBar slot and is filtered out of the scroll body.
  const navComponent = screen.components.find((cmp) => cmp.type === "bottomNav");
  const bodyComponents = screen.components.filter((cmp) => cmp.type !== "bottomNav");

  return (
    <PhoneFrame
      platform={prototype.targetPlatform}
      tokens={prototype.tokens}
      scale={scale}
      bottomBar={
        navComponent ? (
          <ComponentRenderer
            component={navComponent}
            tokens={prototype.tokens}
            onAction={handleAction}
            selected={selectedComponentId === navComponent.id}
            onSelect={onSelectComponent}
          />
        ) : undefined
      }
    >
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={screen.id}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            minHeight: "100%",
            padding: `0 ${pad}px ${pad}px`,
            display: "flex",
            flexDirection: "column",
            gap: prototype.tokens.spacingUnit * 1.25,
          }}
        >
          {bodyComponents.map((cmp) => (
            <ComponentRenderer
              key={cmp.id}
              component={cmp}
              tokens={prototype.tokens}
              onAction={handleAction}
              selected={selectedComponentId === cmp.id}
              onSelect={onSelectComponent}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </PhoneFrame>
  );
}
