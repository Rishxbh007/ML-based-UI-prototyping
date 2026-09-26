import { useEffect, useState } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * TextLoop — a static word followed by a gradient word that cycles, with a
 * blinking cursor. Ported from the supplied 21st.dev component, adapted to
 * Morph's stack:
 *
 *  - `motion/react` → `framer-motion` (v11, already a dependency; `motion` is
 *    not installed and installs are blocked here). Same `LazyMotion`/`m` API.
 *  - Violet/purple defaults remapped onto Morph's own `morph` accent palette.
 *  - The `dark:` branches are dropped — the app is white-first and never sets
 *    `class="dark"`, so they could never fire.
 *  - Size/weight are NOT baked into the base: Morph's `cn` is plain clsx (no
 *    tailwind-merge), so a hardcoded `text-4xl md:text-7xl` would collide with
 *    any size a consumer passes. Consumers set the type scale via `className`
 *    (see the hero and the demo below); the cursor is sized in `em`, so it
 *    tracks whatever font-size is inherited.
 */
interface TextLoopProps {
  staticText?: string;
  rotatingTexts?: string[];
  className?: string;
  interval?: number;
  transition?: Transition;
  staticTextClassName?: string;
  rotatingTextClassName?: string;
  backgroundClassName?: string;
  cursorClassName?: string;
}

export default function TextLoop({
  staticText = "Design",
  rotatingTexts = ["Limitless", "Timeless", "Flawless"],
  className,
  interval = 3000,
  transition = { duration: 0.8, ease: "easeInOut" },
  staticTextClassName,
  rotatingTextClassName,
  backgroundClassName,
  cursorClassName,
}: TextLoopProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingTexts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [rotatingTexts.length, interval]);

  return (
    <LazyMotion features={domAnimation}>
      <div className={cn("inline-flex flex-row items-center w-fit font-medium", className)}>
        {staticText && (
          <span className={cn("mr-3 whitespace-nowrap", staticTextClassName)}>{staticText}</span>
        )}
        <div className="relative flex items-center">
          <AnimatePresence mode="wait">
            <m.div
              key={rotatingTexts[index]}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={transition}
              className="relative overflow-hidden whitespace-nowrap"
            >
              {/* Background gradient box — on-brand morph accent. */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-r from-transparent via-morph-200/30 to-morph-200",
                  backgroundClassName,
                )}
              />
              <span
                className={cn(
                  "relative bg-gradient-to-r from-morph-400 to-morph-700 bg-clip-text pr-1 text-transparent",
                  rotatingTextClassName,
                )}
              >
                {rotatingTexts[index]}
              </span>
            </m.div>
          </AnimatePresence>

          {/* Blinking cursor — sized in em so it tracks the inherited font-size. */}
          <m.div
            className={cn("h-[1.10em] w-[3px] bg-morph-500 sm:h-[1em] md:w-[4px]", cursorClassName)}
            animate={{ opacity: [1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          />
        </div>
      </div>
    </LazyMotion>
  );
}
