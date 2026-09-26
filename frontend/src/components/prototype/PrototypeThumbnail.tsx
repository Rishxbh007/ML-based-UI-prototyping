/**
 * Static, non-interactive preview of a prototype's entry screen — used for
 * dashboard cards. Renders the real components at small scale (pointer events
 * disabled) so thumbnails always match the actual generated design.
 */
import type { Prototype } from "@/types/schema";
import { PhoneFrame } from "./PhoneFrame";
import { ComponentRenderer } from "./ComponentRenderer";

export function PrototypeThumbnail({ prototype, scale = 0.52 }: { prototype: Prototype; scale?: number }) {
  const entry = prototype.navigation?.entry ?? prototype.screens[0]?.id;
  const screen = prototype.screens.find((s) => s.id === entry) ?? prototype.screens[0];
  if (!screen) return null;
  const pad = prototype.tokens.spacingUnit * 2.5;
  const navComponent = screen.components.find((cmp) => cmp.type === "bottomNav");
  const bodyComponents = screen.components.filter((cmp) => cmp.type !== "bottomNav");

  return (
    <div style={{ pointerEvents: "none", userSelect: "none" }} aria-hidden>
      <PhoneFrame
        platform={prototype.targetPlatform}
        tokens={prototype.tokens}
        scale={scale}
        bottomBar={navComponent ? <ComponentRenderer component={navComponent} tokens={prototype.tokens} onAction={() => {}} /> : undefined}
      >
        <div
          style={{
            minHeight: "100%",
            padding: `0 ${pad}px ${pad}px`,
            display: "flex",
            flexDirection: "column",
            gap: prototype.tokens.spacingUnit * 1.25,
          }}
        >
          {bodyComponents.map((cmp) => (
            <ComponentRenderer key={cmp.id} component={cmp} tokens={prototype.tokens} onAction={() => {}} />
          ))}
        </div>
      </PhoneFrame>
    </div>
  );
}
