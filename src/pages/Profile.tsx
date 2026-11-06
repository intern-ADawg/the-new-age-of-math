import { useUser } from "@clerk/react";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { getCase } from "../data/cases";
import { useStudent } from "../lib/StudentContext";
import styles from "./Profile.module.css";

export function Profile() {
  const { user } = useUser();
  const { state, setGoal, loading } = useStudent();
  const [goal, setGoalDraft] = useState("");
  const [flash, setFlash] = useState("");

  if (loading || !state) {
    return <p className={styles.sub}>Loading journey…</p>;
  }

  const name = state.learner.display_name || user?.fullName || "Hero";
  const finished = state.assignments.filter((a) => a.progress.submitted);
  const explored = state.assignments.filter(
    (a) => a.progress.story || a.progress.skill || a.progress.decision,
  );
  const goalValue = goal || state.learner.weekly_goal;

  async function saveGoal(e: FormEvent) {
    e.preventDefault();
    await setGoal(goalValue.trim());
    setFlash("Saved.");
    setTimeout(() => setFlash(""), 2500);
  }

  return (
    <div>
      <p className={styles.eyebrow}>Hero profile</p>
      <h1>{name}</h1>
      <p className={styles.sub}>
        Evidence of growth — cases and badges saved to your account. Never a public rank.
      </p>

      <div className={styles.grid}>
        <motion.section
          className={styles.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>Stats</h2>
          <ul className={styles.list}>
            <li>
              <strong>{state.stats.complete}</strong> cases complete
            </li>
            <li>
              <strong>{state.stats.going}</strong> in progress
            </li>
            <li>
              <strong>{state.stats.warmed}</strong> skills warmed up
            </li>
            <li>
              <strong>
                {state.stats.badges}/{state.stats.badges_total}
              </strong>{" "}
              badges
            </li>
          </ul>
        </motion.section>

        <motion.section
          className={styles.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <h2>Cases touched</h2>
          {explored.length === 0 ? (
            <p className={styles.sub}>Open a case from your desk to begin.</p>
          ) : (
            <ul className={styles.list}>
              {explored.map((a) => (
                <li key={a.case_id}>
                  {a.case_title}
                  {getCase(a.case_id)?.tag ? ` · ${getCase(a.case_id)!.tag}` : ""}
                  {a.progress.submitted ? " · submitted" : ""}
                </li>
              ))}
            </ul>
          )}
          {finished.length > 0 && (
            <p className={styles.sub}>{finished.length} submitted from this account.</p>
          )}
        </motion.section>
      </div>

      <motion.section
        className={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ marginTop: 16 }}
      >
        <h2>Weekly goal</h2>
        <form onSubmit={saveGoal}>
          <input
            value={goalValue}
            onChange={(e) => setGoalDraft(e.target.value)}
            className={styles.input}
            placeholder="What will you finish this week?"
          />
          <button type="submit" className={styles.btn}>
            Save
          </button>
        </form>
        {flash && <p className={styles.sub}>{flash}</p>}
      </motion.section>
    </div>
  );
}
