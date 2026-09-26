/**
 * Premium smartphone frame (no commercial device likeness). A DOM/CSS device
 * built for realism: a machined titanium rail with polished edge highlights, a
 * thin uniform black bezel, glass sheen, side buttons, and either an iOS
 * Dynamic Island or an Android punch-hole camera. Renders a status bar + a
 * scrollable viewport; screen content is passed as children.
 *
 * The device is entirely token-driven and layer-isolated from the platform UI:
 * the screen surface uses the generated prototype's own background/text tokens.
 * Contract is unchanged from the previous frame — same props, same exports, same
 * 320x660 screen geometry — so the prototype content, scroll body and pinned
 * bottom navigation behave identically.
 */
import type { ReactNode } from "react";
import type { DesignTokens } from "@/types/schema";

interface Props {
  platform: "ios" | "android";
  tokens: DesignTokens;
  children: ReactNode;
  scale?: number;
  /**
   * Optional element pinned to the bottom of the phone (bottom navigation).
   * Rendered OUTSIDE the scroll container so it stays fixed while content
   * scrolls underneath — the correct mobile behavior.
   */
  bottomBar?: ReactNode;
}

const WIDTH = 320;
const HEIGHT = 660;
/** Height reserved for the pinned bottom navigation bar. */
export const BOTTOM_NAV_HEIGHT = 62;

/** Machined-titanium rail: bright polished edges catching the light, graphite core. */
const RAIL_BG =
  "linear-gradient(145deg,#5b5e64 0%,#2a2c30 12%,#1b1d21 30%,#33363b 50%,#17181c 70%,#2a2c30 88%,#54575d 100%)";
/** Subtler rail tone used for the physical side buttons. */
const BUTTON_BG = "linear-gradient(90deg,#26282c,#3f4247 45%,#4a4d52 55%,#232529)";

export function PhoneFrame({ platform, tokens, children, scale = 1, bottomBar }: Props) {
  const isIos = platform === "ios";
  return (
    <div style={{ width: WIDTH * scale, height: HEIGHT * scale, transformOrigin: "top center" }}>
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          position: "relative",
        }}
      >
        {/* SIDE BUTTONS — machined into the rail. Left: action + volume up/down;
            right: side (power) button. Sit just proud of the metal edge. */}
        <Btn side="left" top={118} height={26} />
        <Btn side="left" top={166} height={52} />
        <Btn side="left" top={228} height={52} />
        <Btn side="right" top={196} height={74} />

        {/* DEVICE — titanium rail */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 56,
            padding: 5,
            background: RAIL_BG,
            boxShadow: [
              "inset 0 0 0 1px rgba(255,255,255,0.20)",
              "inset 0 1.5px 1.5px rgba(255,255,255,0.28)",
              "inset 0 -2px 2px rgba(0,0,0,0.55)",
              "0 1px 2px rgba(0,0,0,0.4)",
              "0 30px 60px -22px rgba(0,0,0,0.55)",
              "0 60px 100px -50px rgba(0,0,0,0.4)",
            ].join(","),
          }}
        >
          {/* black bezel */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 51,
              background: "#050506",
              padding: 7,
              boxShadow: "inset 0 0 3px 1px rgba(0,0,0,0.9)",
            }}
          >
            {/* screen surface — 296x636, identical to the previous frame */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 44,
                overflow: "hidden",
                background: tokens.colors.background,
                boxShadow: "inset 0 0 1px 0.5px rgba(0,0,0,0.45)",
              }}
            >
              {/* status bar */}
              <div
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 46, zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0 24px", color: tokens.colors.text,
                  fontFamily: tokens.typography.fontFamily, fontSize: 13, fontWeight: 600,
                  pointerEvents: "none",
                }}
              >
                <span style={{ letterSpacing: "0.02em" }}>9:41</span>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ width: 17, height: 10, border: `1.5px solid ${tokens.colors.text}`, borderRadius: 3, opacity: 0.9 }} />
                </span>
              </div>

              {/* iOS Dynamic Island / Android punch-hole camera */}
              {isIos ? (
                <div
                  style={{
                    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                    width: 92, height: 27, background: "#000", borderRadius: 999, zIndex: 30,
                    display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 9,
                    boxShadow: "inset 0 0 1px 0.5px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: "radial-gradient(circle at 32% 30%,#2c3c6b,#05060a 68%)",
                      boxShadow: "inset 0 0 1px rgba(130,160,255,0.55)",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)",
                    width: 11, height: 11, borderRadius: 999, zIndex: 30,
                    background: "radial-gradient(circle at 35% 30%,#26345212,#04050a 70%)",
                    boxShadow: "0 0 0 2px #000, inset 0 0 1px rgba(120,150,255,0.5)",
                  }}
                />
              )}

              {/* glass sheen — a single quiet diagonal light catch, top-left */}
              <div
                aria-hidden
                style={{
                  position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none",
                  borderRadius: 44,
                  background:
                    "linear-gradient(128deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.03) 16%,transparent 32%)",
                }}
              />

              {/* scrollable content viewport. When a bottom bar is present we
                  reserve space for it (fixed nav must not obscure content) so
                  the last items stay above the nav + home indicator. */}
              <div
                className="no-scrollbar"
                style={{
                  position: "absolute", inset: 0, paddingTop: 54,
                  paddingBottom: bottomBar ? BOTTOM_NAV_HEIGHT + (isIos ? 16 : 8) : 0,
                  overflowY: "auto", overflowX: "hidden",
                }}
              >
                {children}
              </div>

              {/* pinned bottom navigation — outside the scroll container so it
                  never moves with content */}
              {bottomBar && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 25 }}>
                  {bottomBar}
                </div>
              )}

              {/* home indicator */}
              {isIos && (
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 120, height: 5, borderRadius: 999, background: tokens.colors.text, opacity: 0.3, zIndex: 30, pointerEvents: "none" }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single machined side button seated on the titanium rail. */
function Btn({ side, top, height }: { side: "left" | "right"; top: number; height: number }) {
  return (
    <div
      style={{
        position: "absolute", top, height, width: 3,
        [side]: -1.5,
        borderRadius: 2,
        background: BUTTON_BG,
        boxShadow:
          side === "left"
            ? "inset 1px 0 1px rgba(255,255,255,0.25), -1px 0 2px rgba(0,0,0,0.4)"
            : "inset -1px 0 1px rgba(255,255,255,0.25), 1px 0 2px rgba(0,0,0,0.4)",
        zIndex: 5,
      }}
    />
  );
}

export const PHONE_DIMENSIONS = { WIDTH, HEIGHT };
