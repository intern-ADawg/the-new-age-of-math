import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CASES } from "../data/cases";
import { flagsFromProgress } from "../components/JourneyStrip";
import { useStudent } from "../lib/StudentContext";
import styles from "./Catalog.module.css";

export function Catalog() {
  const { state, loading } = useStudent();

  if (loading) {
    return <p className={styles.sub}>Loading cases…</p>;
  }

  const assigned = new Map(
    (state?.assignments || []).map((a) => [a.case_id, a] as const),
  );

  return (
    <div>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Case catalog</p>
        <h1>Your assigned work</h1>
        <p className={styles.sub}>
          Open a case in-app — story, warm-up, notebook, then one-click Submit. Progress saves to your
          account.
        </p>
      </header>
      <h2 className={styles.week}>Assigned</h2>
      <div className={styles.grid}>
        {CASES.filter((c) => assigned.has(c.id)).map((c, i) => {
          const a = assigned.get(c.id)!;
          const flags = flagsFromProgress(a.progress);
          const label = a.progress.submitted
            ? "Submitted"
            : flags.count
              ? "In progress"
              : "Not started";
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <Link className={styles.card} to={`/case/${c.id}`}>
                <span className={styles.tag}>{c.tag}</span>
                <h3>{c.title}</h3>
                <p className={styles.ask}>{c.ask}</p>
                <div className={styles.foot}>
                  <span>{label}</span>
                  <span className={styles.go}>Open →</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
        {!CASES.some((c) => assigned.has(c.id)) && (
          <p className={styles.sub}>No cases assigned yet. Check back with your guide.</p>
        )}
      </div>
    </div>
  );
}
