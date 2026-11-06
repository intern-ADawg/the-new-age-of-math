import { Navigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/react";
import { CaseWarmup } from "../components/CaseWarmup";
import { getCase } from "../data/cases";
import { useNavigate } from "react-router-dom";
import styles from "./Warmup.module.css";

/** Standalone warm-up route — same component as the in-case tab. */
export function Warmup() {
  const { caseId = "" } = useParams();
  const meta = getCase(caseId);
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  if (!isLoaded) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!meta) {
    return (
      <div>
        <p>No warm-up for this case.</p>
      </div>
    );
  }

  const learnerName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Hero";

  return (
    <div>
      <p className={styles.eyebrow}>Warm-up</p>
      <h1>Get ready for {meta.title}</h1>
      <CaseWarmup
        caseId={caseId}
        learnerName={learnerName}
        onDone={() => navigate(`/case/${caseId}`)}
      />
    </div>
  );
}
