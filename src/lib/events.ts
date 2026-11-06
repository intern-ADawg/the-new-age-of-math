/** R9 event log — client source of truth for points, journey, and guide signals. */

export type EventType =
  | "entered"
  | "case_opened"
  | "warmup_started"
  | "warmup_completed"
  | "warmup_skipped"
  | "step_attempt"
  | "coach_opened"
  | "coach_message"
  | "submit"
  | "reflect"
  | "confidence"
  | "confusing"
  | "weekly_goal_set"
  | "wondering_set";

export type HeroEvent = {
  id: string;
  learner: string;
  caseId?: string;
  step?: string;
  type: EventType;
  payload?: Record<string, unknown>;
  ts: string;
};

const EVENTS_KEY = "mb_events";

function read(): HeroEvent[] {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]") as HeroEvent[];
  } catch {
    return [];
  }
}

function write(events: HeroEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-500)));
  window.dispatchEvent(new CustomEvent("mb-events"));
}

export function logEvent(
  partial: Omit<HeroEvent, "id" | "ts"> & { ts?: string },
): HeroEvent {
  const event: HeroEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: partial.ts ?? new Date().toISOString(),
    learner: partial.learner,
    caseId: partial.caseId,
    step: partial.step,
    type: partial.type,
    payload: partial.payload,
  };
  const all = read();
  all.push(event);
  write(all);
  // Best-effort server mirror
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
  return event;
}

export function getEvents(learner?: string): HeroEvent[] {
  const all = read();
  return learner ? all.filter((e) => e.learner === learner) : all;
}

export function useEventsListener(cb: () => void) {
  window.addEventListener("mb-events", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("mb-events", cb);
    window.removeEventListener("storage", cb);
  };
}
