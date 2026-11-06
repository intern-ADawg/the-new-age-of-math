import { motion } from "motion/react";
import { HERO_JOURNEY } from "../lib/profile";
import styles from "./HeroJourney.module.css";

type Props = {
  currentStop: number; // 1–9
};

export function HeroJourney({ currentStop }: Props) {
  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Hero’s journey</p>
      <ol className={styles.track} aria-label="Hero journey stops">
        {HERO_JOURNEY.map((stop, i) => {
          const state =
            stop.n < currentStop ? "done" : stop.n === currentStop ? "current" : "";
          return (
            <motion.li
              key={stop.n}
              className={[
                styles.item,
                state === "done" ? styles.done : "",
                state === "current" ? styles.current : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={stop.blurb}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
            >
              <span className={styles.dot}>
                {state === "done" ? "✓" : stop.n}
              </span>
              <span className={styles.title}>{stop.title}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
