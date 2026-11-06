import { getEvents, type HeroEvent } from "./events";
import { getProgress } from "./storage";
import { CASES } from "../data/cases";

const PROFILE_KEY = "mb_profile";

export type HeroProfile = {
  weeklyGoal: string;
  wondering: string;
  confidencePre?: number;
  confidencePost?: number;
  pointsAlias?: string;
  showOnBoard: boolean;
};

const DEFAULT: HeroProfile = {
  weeklyGoal: "",
  wondering: "",
  showOnBoard: false,
};

export function getProfile(): HeroProfile {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") };
  } catch {
    return { ...DEFAULT };
  }
}

export function updateProfile(patch: Partial<HeroProfile>): HeroProfile {
  const next = { ...getProfile(), ...patch };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mb-events"));
  return next;
}

/** Effort/depth points from the event log (R4) — never raw score or speed. */
export function computePoints(learner: string): {
  total: number;
  casesCompleted: number;
  pitchDepth: number;
  persistence: number;
  feedback: number;
  fields: number;
  breakdown: { label: string; pts: number }[];
} {
  const events = getEvents(learner);
  const completed = CASES.filter((c) => getProgress(c.id).status === "submitted").length;
  const fields = new Set(
    CASES.filter((c) => getProgress(c.id).status !== "not-started").map((c) => c.field),
  ).size;
  const feedback = events.filter((e) => e.type === "reflect").length;
  const persistence = events.filter(
    (e) => e.type === "warmup_completed" || e.type === "coach_message",
  ).length;
  // Pitch depth proxy until AI grading: reflection + submit counts as depth effort
  const pitchDepth = events.filter((e) => e.type === "submit" || e.type === "reflect").length;

  const breakdown = [
    { label: "Cases completed", pts: completed * 40 },
    { label: "Pitch / reflection depth", pts: pitchDepth * 12 },
    { label: "Persistence (warm-up & coach)", pts: Math.min(persistence, 12) * 5 },
    { label: "Case feedback given", pts: feedback * 8 },
    { label: "Fields explored", pts: fields * 15 },
  ];
  const total = breakdown.reduce((s, b) => s + b.pts, 0);
  return {
    total,
    casesCompleted: completed,
    pitchDepth,
    persistence,
    feedback,
    fields,
    breakdown,
  };
}

export function primaryNextStep(learner: string): {
  label: string;
  to: string;
  detail: string;
} {
  const featured = CASES[0];
  const progress = getProgress(featured.id);
  const events = getEvents(learner);
  const warmed =
    events.some((e) => e.caseId === featured.id && e.type === "warmup_completed") ||
    events.some((e) => e.caseId === featured.id && e.type === "warmup_skipped");

  if (progress.status === "submitted") {
    const reflected = events.some((e) => e.caseId === featured.id && e.type === "reflect");
    if (!reflected) {
      return {
        label: "Reflect on Driving Age",
        to: `/case/${featured.id}#reflect`,
        detail: "Capture what was new and rate your confidence — not graded.",
      };
    }
    return {
      label: "View your journey",
      to: "/profile",
      detail: "See fields explored, points, and what you're still wondering.",
    };
  }
  if (progress.status === "in-progress") {
    return {
      label: "Continue Driving Age",
      to: `/case/${featured.id}`,
      detail: "Pick up in the case — then hit Submit when you're ready.",
    };
  }
  if (!warmed) {
    return {
      label: "Start Driving Age",
      to: `/case/${featured.id}`,
      detail: "Watch the story, then the skill warm-up — both live inside the case.",
    };
  }
  return {
    label: "Start Driving Age",
    to: `/case/${featured.id}`,
    detail: "Work the case in-app, then one-click Submit — no PDF.",
  };
}

export function journeyStopIndex(learner: string, caseId: string): number {
  const progress = getProgress(caseId);
  const events = getEvents(learner);
  const hasWarmup = events.some(
    (e) =>
      e.caseId === caseId &&
      (e.type === "warmup_completed" || e.type === "warmup_skipped"),
  );
  const reflected = events.some((e) => e.caseId === caseId && e.type === "reflect");
  if (reflected) return 8; // next assignment
  if (progress.status === "submitted") return 7; // reflect
  if (progress.status === "in-progress") return 4; // work with coach
  if (hasWarmup) return 3; // kickoff
  return 1; // pick / warm-up
}

export type JourneyStop = {
  n: number;
  title: string;
  blurb: string;
};

export const HERO_JOURNEY: JourneyStop[] = [
  { n: 1, title: "Pick", blurb: "Assigned or recommended from your journey" },
  { n: 2, title: "Warm-up", blurb: "Quick readiness check — skip if strong" },
  { n: 3, title: "Kickoff", blurb: "Meet the world before the data" },
  { n: 4, title: "Work + Coach", blurb: "Dialogue, not a form" },
  { n: 5, title: "Summary", blurb: "Five-part pitch of your call" },
  { n: 6, title: "Discuss", blurb: "Socratic room — twist and re-vote" },
  { n: 7, title: "Reflect", blurb: "What was new; confidence check" },
  { n: 8, title: "Profile", blurb: "Points, fields, history" },
  { n: 9, title: "Next", blurb: "Recommended next case" },
];

export function recentActivity(learner: string): HeroEvent[] {
  return getEvents(learner).slice(-8).reverse();
}
