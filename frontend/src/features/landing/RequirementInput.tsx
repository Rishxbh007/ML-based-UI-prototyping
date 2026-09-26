/**
 * The requirement composer — Morph's primary interaction and the centrepiece
 * of the landing hero. Not a textarea: a considered product surface. A quiet
 * label, a generous writing area, elegant example prompts, and one accent
 * action. Submitting hands the description to the Create flow (which runs the
 * real analysis + generation pipeline) via router state.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Kbd } from "@/components/ui/primitives";
import { GradientBlobAura } from "@/components/ui/gradient-bold-card";

const EXAMPLES: Array<{ label: string; prompt: string }> = [
  { label: "Travel", prompt: "A travel app to search flights, book a hotel and plan a trip itinerary." },
  { label: "Banking", prompt: "A mobile banking app to check balance, review transactions, transfer money and pay bills." },
  { label: "Food delivery", prompt: "A food delivery app where users browse restaurants, search dishes, add items to a cart and check out." },
  { label: "Education", prompt: "An e-learning app where students browse courses, watch lessons, take quizzes and track progress." },
];

export function RequirementInput({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const description = value.trim();
    if (description.length < 12) {
      setError("Add a little more detail — a sentence describing the app.");
      ref.current?.focus();
      return;
    }
    setError(null);
    navigate("/create", { state: { description, autostart: true } });
  };

  const pick = (prompt: string) => {
    setValue(prompt);
    setError(null);
    ref.current?.focus();
  };

  return (
    <div className="w-full">
      <div className="relative">
        {/* Animated gradient-blob aura drifting behind the composer. */}
        <GradientBlobAura />
        <div
          className={[
            "relative rounded-2xl border bg-white transition-all duration-200 ease-out-expo",
            focused ? "border-morph-300 shadow-raised" : "border-line shadow-soft",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 px-5 pt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-morph-500" />
            <span className="text-xs font-medium text-ink-muted">Describe your app</span>
          </div>
          <label htmlFor="requirement" className="sr-only">
            Describe the app you want to prototype
          </label>
          <textarea
            id="requirement"
            ref={ref}
            autoFocus={autoFocus}
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            rows={3}
            placeholder="A food delivery app where users browse restaurants, add items to a cart and check out…"
            className="composer-field block w-full resize-none bg-transparent px-5 pb-4 pt-3 text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            {error ? (
              <p role="alert" className="text-xs text-morph-600">
                {error}
              </p>
            ) : (
              <div className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
                <span className="ml-1">to generate</span>
              </div>
            )}
            <button
              onClick={submit}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-lg bg-morph-500 px-5 text-sm font-medium text-white transition-all duration-200 ease-out-expo hover:bg-morph-600 active:translate-y-px"
            >
              Generate prototype
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-xs text-ink-faint">Try</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.label}
            onClick={() => pick(e.prompt)}
            className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
