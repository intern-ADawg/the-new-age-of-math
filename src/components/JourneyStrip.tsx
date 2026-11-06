import { motion } from "motion/react";
import { JOURNEY_STAGES } from "../lib/journey";
import styles from "./JourneyStrip.module.css";

export type JourneyProgress = {
  story?: boolean;
  skill?: boolean;
  read?: boolean;
  notebook?: boolean;
  decision?: boolean;
  submitted?: boolean;
};

function flagsFromProgress(p?: JourneyProgress) {
  const done = [
    !!p?.story,
    !!p?.skill,
    !!p?.read,
    !!p?.notebook,
    !!p?.decision,
    !!p?.submitted,
  ];
  const next = done.indexOf(false);
  return { done, next: next < 0 ? done.length - 1 : next, count: done.filter(Boolean).length };
}

export function JourneyStrip({ progress }: { progress?: JourneyProgress }) {
  const { done, next } = flagsFromProgress(progress);

  return (
    <ol className={styles.list} aria-label="Case journey">
      {JOURNEY_STAGES.map((label, i) => {
        const state = done[i] ? "done" : i === next ? "current" : "";
        return (
          <motion.li
            key={label}
            className={[
              styles.item,
              state === "current" ? styles.current : "",
              state === "done" ? styles.done : "",
            ]
              .filter(Boolean)
              .join(" ")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.dot}>{done[i] ? "✓" : i + 1}</span>
            <span className={styles.text}>{label}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}

export { flagsFromProgress };
