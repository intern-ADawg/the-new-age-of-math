import type { CaseStatus } from "../data/cases";

const LEARNER_KEY = "mb_learner";
const PROGRESS_KEY = "mb_progress";

export type Learner = {
  name: string;
  joinedAt: string;
};

export type CaseProgress = {
  status: CaseStatus;
  openedAt?: string;
  submittedAt?: string;
  receiptId?: string;
  updatedAt: string;
};

type ProgressMap = Record<string, CaseProgress>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLearner(): Learner | null {
  return readJson<Learner | null>(LEARNER_KEY, null);
}

export function setLearner(name: string): Learner {
  const existing = getLearner();
  const learner: Learner = {
    name: name.trim(),
    joinedAt: existing?.joinedAt ?? new Date().toISOString(),
  };
  writeJson(LEARNER_KEY, learner);
  return learner;
}

export function clearLearner() {
  localStorage.removeItem(LEARNER_KEY);
}

export function getAllProgress(): ProgressMap {
  return readJson<ProgressMap>(PROGRESS_KEY, {});
}

export function getProgress(caseId: string): CaseProgress {
  return (
    getAllProgress()[caseId] ?? {
      status: "not-started",
      updatedAt: new Date().toISOString(),
    }
  );
}

export function updateProgress(
  caseId: string,
  changes: Partial<CaseProgress>,
): CaseProgress {
  const all = getAllProgress();
  const cur = all[caseId] ?? {
    status: "not-started" as CaseStatus,
    updatedAt: new Date().toISOString(),
  };

  let nextStatus = changes.status ?? cur.status;
  // Never downgrade submitted
  if (cur.status === "submitted" && nextStatus !== "submitted") {
    nextStatus = "submitted";
  }

  const next: CaseProgress = {
    ...cur,
    ...changes,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  all[caseId] = next;
  writeJson(PROGRESS_KEY, all);
  window.dispatchEvent(new CustomEvent("mb-progress"));
  return next;
}

export function markOpened(caseId: string) {
  const cur = getProgress(caseId);
  if (cur.status === "submitted") return cur;
  return updateProgress(caseId, {
    status: "in-progress",
    openedAt: cur.openedAt ?? new Date().toISOString(),
  });
}

export function markSubmitted(caseId: string, receiptId: string) {
  return updateProgress(caseId, {
    status: "submitted",
    submittedAt: new Date().toISOString(),
    receiptId,
  });
}

export function useProgressVersion(listener: () => void) {
  // helper used by pages via useEffect
  window.addEventListener("mb-progress", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("mb-progress", listener);
    window.removeEventListener("storage", listener);
  };
}
