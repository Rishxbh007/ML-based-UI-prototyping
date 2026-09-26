import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/Button";
import { liquidButtonVariants, LiquidSurface } from "@/components/ui/LiquidGlassButton";
import TextLoop from "@/components/ui/text-loop";
import { AnimatedText } from "@/components/ui/animated-text";
import { MorphHero } from "@/features/landing/MorphHero";
import { DomainConstellation } from "@/features/landing/DomainConstellation";
import { ExamplesSection } from "@/features/landing/ExamplesSection";
import { TubesBackground } from "@/components/ui/neon-flow";
import Nebula from "@/components/ui/nebula";

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-content px-6 ${className}`}>
      {children}
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Describe", body: "Write what the app should do in plain English — the users, the features, the actions." },
  { n: "02", title: "Understand", body: "A trained classifier and NLP extractor identify the app type, features and actions, with confidence shown." },
  { n: "03", title: "Generate", body: "A deterministic engine turns that understanding into screens, components and a navigation flow." },
  { n: "04", title: "Prototype", body: "Open the result in an interactive phone frame — tap through it, then refine it in words." },
];

export default function LandingPage() {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-canvas">


      {/* Nav — minimal, almost invisible. */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/75 backdrop-blur-xl">
        <Section className="flex h-16 items-center justify-between">
          <Wordmark />
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#how-it-works" className="text-sm text-ink-muted transition-colors hover:text-ink">How it works</a>
            <a href="#examples" className="text-sm text-ink-muted transition-colors hover:text-ink">Examples</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="hidden text-sm text-ink-muted transition-colors hover:text-ink sm:block">
              Projects
            </Link>
            <Link to="/create">
              <Button size="sm">Generate</Button>
            </Link>
          </div>
        </Section>
      </header>

      {/* Hero — Morph's own scroll-reactive composition: composer + a live
          on-device prototype that straightens as you scroll. */}
      <MorphHero />

      {/* The understanding layer — Morph's own. A dark, dramatic band lit by a
          live domain-warped Nebula shader (raw WebGL, no deps). Full-bleed: a
          full-width dark section carries the Nebula as an absolute,
          pointer-events-none backdrop, content held in relative z-10. No phone
          here — the hero already carries one; this shows what the model reads. */}
      <section className="relative mt-16 overflow-hidden border-y border-white/10 bg-[#0d0620] md:mt-20">
        <Nebula className="opacity-90" speed={1.6} />
        {/* Gentle top/bottom fade so the band seats into the page. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0620] via-transparent to-[#0d0620]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto grid max-w-content items-center gap-x-10 gap-y-8 px-6 py-16 md:grid-cols-2 md:py-20">
          {/* Left — the premium copy. */}
          <motion.div {...reveal} className="max-w-lg">
            <p className="inline-flex items-center gap-2.5 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-fuchsia-200/70">
              <span className="h-px w-8 bg-gradient-to-r from-fuchsia-300/70 to-transparent" />
              One prompt · eleven domains
            </p>
            <h2 className="mt-5 font-display text-display font-semibold leading-[1.05] tracking-tight text-white">
              It knows what it&rsquo;s{" "}
              <span className="bg-gradient-to-r from-white via-fuchsia-100 to-fuchsia-300 bg-clip-text text-transparent">
                looking at.
              </span>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/60">
              Before a single screen exists, Morph weighs your requirement against every
              domain it knows and commits to one — with the confidence to prove it.
            </p>
            <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-white/40">
              <span>Trained classifier</span>
              <span className="text-fuchsia-300/50">/</span>
              <span>Confidence-scored</span>
              <span className="text-fuchsia-300/50">/</span>
              <span>Zero guesswork</span>
            </p>
          </motion.div>

          {/* Right — the interactive starfield. */}
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
            <DomainConstellation />
          </motion.div>
        </div>
      </section>

      {/* Ideas in motion — a full-bleed dark, interactive band hosting the real
          CDN tubes effect, themed to Morph. Sits as the third section, below the
          product stage. Move the cursor to steer the flow; click to shift colours. */}
      <section className="relative">
        <TubesBackground className="min-h-screen">
          <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-white/55">
              Describe it · watch it take shape
            </p>
            <h2 className="max-w-4xl font-display text-display-xl text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.55)]">
              Ideas in motion.
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-white/65">
              Morph turns a plain-English requirement into screens, components and a
              navigable flow. Move your cursor to steer the current — click anywhere to
              shift its colours.
            </p>
            <Link
              to="/create"
              className={liquidButtonVariants({ variant: "onDark", size: "lg", className: "pointer-events-auto mt-4" })}
            >
              <LiquidSurface>Generate a prototype</LiquidSurface>
            </Link>
          </div>
        </TubesBackground>
      </section>

      {/* How it works — editorial, hairline-separated, no cards. Lit by a soft
          cool indigo/sky wash so the white band picks up colour. */}
      <section id="how-it-works" className="relative isolate overflow-hidden py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(55% 55% at 14% 12%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(52% 58% at 90% 38%, rgba(56,189,248,0.16), transparent 62%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-content px-6">
          <motion.div {...reveal}>
            <h2 className="sr-only">How it works</h2>
            <AnimatedText
              text="How it works"
              fontSize="clamp(2.25rem, 6vw, 4rem)"
              minWeight={200}
              maxWeight={800}
              className="justify-start text-ink"
            />
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              From plain English to a working flow, in four honest steps.
            </p>
          </motion.div>
          <div className="mt-14 grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.06 }}
                className="border-t border-line pt-6 lg:pr-6"
              >
                <span className="font-display text-index text-ink-faint">{s.n}</span>
                <h3 className="mt-4 font-display text-title text-ink">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Generated examples — genuinely live. Warm fuchsia/amber wash to give
          the examples band its own colour identity. */}
      <section id="examples" className="relative isolate overflow-hidden py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(55% 55% at 18% 12%, rgba(217,70,239,0.16), transparent 60%), radial-gradient(52% 58% at 88% 42%, rgba(251,146,60,0.15), transparent 62%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-content px-6">
          <motion.div {...reveal} className="max-w-2xl">
            <h2 className="font-display text-display text-ink">Real prototypes you can explore.</h2>
            <p className="mt-4 text-ink-soft">
              Each was produced by the same pipeline your prompts run through — the requirement,
              what the model understood, and the prototype it generated.
            </p>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} className="mt-12">
            <ExamplesSection />
          </motion.div>
        </div>
      </section>

      {/* Final CTA — full-bleed, full-viewport. The app-wide ripple layer
          (mounted in App) makes clicks anywhere across it send out ripples. */}
      <section className="flex min-h-screen items-center border-t border-line bg-gradient-to-br from-morph-50 via-white to-fuchsia-50/60">
        <div className="mx-auto w-full max-w-content px-6 py-24 md:py-32">
          <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-display text-display-xl text-ink">
              Describe your app.
            </h2>
            <div className="mt-2 flex justify-center">
              <TextLoop
                className="font-display text-display-xl"
                staticText="See it"
                rotatingTexts={["prototyped", "built", "real", "alive"]}
                staticTextClassName="text-ink"
              />
            </div>
            <div className="mt-9 flex justify-center">
              <Link to="/create">
                <Button size="lg">Generate a prototype</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer — minimal. */}
      <footer className="border-t border-line py-10">
        <Section className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Wordmark size="sm" />
          <p className="text-sm text-ink-muted">
            ML-Based Prototyping of Graphical User Interfaces for Mobile Applications
          </p>
        </Section>
      </footer>
    </motion.main>
  );
}
