import { api } from "./api";
import { patchCaseJourney, type CaseJourney } from "./journey";

/** Persist journey locally and to Neon (when signed in). */
export async function syncProgress(
  caseId: string,
  patch: Partial<CaseJourney> & { pick?: string | null; submitted?: boolean },
) {
  patchCaseJourney(caseId, patch);
  try {
    await api("/api/student/progress", {
      method: "POST",
      json: { caseId, ...patch },
    });
  } catch {
    // Offline / unsigned — local journey still updated.
  }
}
