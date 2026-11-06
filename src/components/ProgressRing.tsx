import { motion } from "motion/react";
import styles from "./ProgressRing.module.css";

type Props = {
  value: number;
  label?: string;
  size?: number;
};

export function ProgressRing({ value, label = "done", size = 112 }: Props) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className={styles.wrap} style={{ ["--size" as string]: `${size}px` }}>
      <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden>
        <circle className={styles.track} cx="50" cy="50" r={r} />
        <motion.circle
          className={styles.arc}
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className={styles.label}>
        {Math.round(pct)}%
        <span className={styles.sub}>{label}</span>
      </div>
    </div>
  );
}
