/**
 * Prebuilt demo prototypes.
 *
 * Built by running the real generation engine over canned descriptions at load
 * time, so they exercise the exact same pipeline as user-created prototypes
 * (no separate hardcoded screens). This makes the app impressive immediately
 * and gives the viva a reliable, offline demo set.
 */
import type { CreateProjectInput, Project } from "@/types/schema";
import { analyzeLocally } from "@/lib/localAnalysis";
import { generate } from "@/lib/generator";

interface DemoSpec {
  id: string;
  input: CreateProjectInput;
}

const SPECS: DemoSpec[] = [
  {
    id: "demo-food",
    input: {
      name: "Feast",
      description:
        "A food delivery app where users sign up, browse restaurants, search for dishes, add items to a cart and place an order with checkout.",
      targetPlatform: "ios",
      designStyle: "warm, modern, appetizing",
      targetAudience: "busy urban foodies",
    },
  },
  {
    id: "demo-fitness",
    input: {
      name: "Pulse",
      description:
        "A fitness tracking app for college students to log workouts, track progress and calories, and follow training plans with a profile.",
      targetPlatform: "ios",
      designStyle: "energetic, premium, dark",
      targetAudience: "college students",
    },
  },
  {
    id: "demo-banking",
    input: {
      name: "Vault",
      description:
        "A mobile banking app to check balance, view transactions, transfer money and pay bills securely with a dashboard and profile.",
      targetPlatform: "android",
      designStyle: "trustworthy, clean, corporate",
      targetAudience: "everyday consumers",
    },
  },
  {
    id: "demo-education",
    input: {
      name: "Lumen",
      description:
        "An e-learning app where students browse courses, watch lessons, take quizzes and track their learning progress.",
      targetPlatform: "ios",
      designStyle: "calm, minimal, focused",
      targetAudience: "lifelong learners",
    },
  },
];

function buildDemo(spec: DemoSpec): Project {
  const analysis = analyzeLocally(spec.input.description);
  const prototype = generate(analysis, spec.input);
  const now = new Date().toISOString();
  return {
    id: spec.id,
    name: spec.input.name,
    description: spec.input.description,
    targetPlatform: spec.input.targetPlatform,
    designStyle: spec.input.designStyle,
    targetAudience: spec.input.targetAudience,
    createdAt: now,
    updatedAt: now,
    prototype,
  };
}

/** Fresh demo projects (rebuilt each call so ids/state never collide). */
export function buildDemoProjects(): Project[] {
  return SPECS.map(buildDemo);
}

export const DEMO_META = SPECS.map((s) => ({
  id: s.id,
  name: s.input.name,
  description: s.input.description,
}));
