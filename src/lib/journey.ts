import { getEvents } from "./events";
import { getProgress } from "./storage";

export const JOURNEY_STAGES = [
  "Story",
  "Warm-up",
  "Read",
  "Notebook",
  "Decide",
  "Submit",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

const STAGE_KEY = "mb-journey:";

export type CaseJourney = {
  story?: boolean;
  skill?: boolean;
  read?: boolean;
  notebook?: boolean;
  decision?: boolean;
  submitted?: boolean;
  pick?: string | null;
  updated?: string;
};

function readJourney(caseId: string): CaseJourney {
  try {
    return JSON.parse(localStorage.getItem(STAGE_KEY + caseId) || "{}") as CaseJourney;
  } catch {
    return {};
  }
}

export function getCaseJourney(caseId: string, learner?: string): CaseJourney {
  const stored = readJourney(caseId);
  const progress = getProgress(caseId);
  const events = learner ? getEvents(learner) : [];
  const warmed =
    stored.skill ||
    events.some(
      (e) =>
        e.caseId === caseId &&
        (e.type === "warmup_completed" || e.type === "warmup_skipped"),
    );
  return {
    ...stored,
    skill: warmed || stored.skill,
    decision: stored.decision || progress.status !== "not-started",
    notebook: stored.notebook,
    story: stored.story,
    read: stored.read || progress.status !== "not-started",
  };
}

export function patchCaseJourney(caseId: string, patch: Partial<CaseJourney>) {
  const next = {
    ...readJourney(caseId),
    ...patch,
    updated: new Date().toISOString(),
  };
  localStorage.setItem(STAGE_KEY + caseId, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mb-progress"));
  return next;
}

export function journeyFlags(
  caseId: string,
  learner?: string,
): { done: boolean[]; next: number; count: number } {
  const j = getCaseJourney(caseId, learner);
  const submitted = getProgress(caseId).status === "submitted";
  const done = [
    !!j.story,
    !!j.skill,
    !!j.read,
    !!j.notebook,
    !!j.decision,
    submitted,
  ];
  const next = done.indexOf(false);
  return { done, next: next < 0 ? done.length - 1 : next, count: done.filter(Boolean).length };
}

export const NEXT_TEXT = [
  "Watch the story to start.",
  "Do the skill warm-up to unlock the case.",
  "Read through the chapters.",
  "Finish the Working Notebook — every step checked.",
  "Make your final decision.",
  "Submit your work.",
];
