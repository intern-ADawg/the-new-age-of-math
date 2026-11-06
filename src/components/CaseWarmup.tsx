import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { scoreWarmup, WARMUPS } from "../data/warmup";
import { logEvent } from "../lib/events";
import { syncProgress } from "../lib/syncProgress";
import styles from "../pages/Warmup.module.css";

type Props = {
  caseId: string;
  learnerName: string;
  onDone: () => void;
};

export function CaseWarmup({ caseId, learnerName, onDone }: Props) {
  const items = WARMUPS[caseId] || [];
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const item = items[index];
  const grid = useMemo(
    () => (done ? scoreWarmup(items, answers) : []),
    [done, items, answers],
  );

  if (!items.length) {
    return (
      <p>
        No warm-up for this case.{" "}
        <button type="button" className={styles.btn} onClick={onDone}>
          Continue →
        </button>
      </p>
    );
  }

  function finish(skipped: boolean) {
    void syncProgress(caseId, { skill: true });
    logEvent({
      learner: learnerName,
      caseId,
      type: skipped ? "warmup_skipped" : "warmup_completed",
      payload: skipped ? undefined : { answers },
    });
    onDone();
  }

  function choose(choiceIndex: number) {
    if (picked !== null) return;
    setPicked(choiceIndex);
    setAnswers((a) => ({ ...a, [item.id]: choiceIndex }));
    logEvent({
      learner: learnerName,
      caseId,
      step: item.id,
      type: "step_attempt",
      payload: { warmup: true, choice: choiceIndex, correct: choiceIndex === item.answer },
    });
  }

  function next() {
    if (picked === null) return;
    if (index + 1 >= items.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  if (done) {
    return (
      <div className={styles.card}>
        <p className={styles.eyebrow}>Warm-up complete</p>
        <p className={styles.sub} style={{ marginTop: 0 }}>
          Skill grid for your guide (and Coach). Not a grade — and it never blocks you.
        </p>
        <div className={styles.grid}>
          {grid.map((g) => (
            <span key={g.skill} className={styles.pill}>
              {g.skill}: {g.level}
            </span>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => finish(false)}>
            Continue the case →
          </button>
        </div>
      </div>
    );
  }

  const revealed = picked !== null;

  return (
    <div>
      <p className={styles.eyebrow}>
        Warm-up · {index + 1} of {items.length}
      </p>
      <p className={styles.sub} style={{ marginTop: 0 }}>
        Five quick checks on the skills this case needs. Skip anytime.
      </p>
      <motion.div
        key={item.id}
        className={styles.card}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className={styles.skill}>{item.skill}</p>
        <p className={styles.prompt}>{item.prompt}</p>
        <div className={styles.choices}>
          {item.choices.map((c, i) => {
            let cls = styles.choice;
            if (revealed && i === item.answer) cls += ` ${styles.correct}`;
            else if (revealed && i === picked && i !== item.answer) cls += ` ${styles.wrong}`;
            else if (!revealed && i === picked) cls += ` ${styles.selected}`;
            return (
              <button key={c} type="button" className={cls} onClick={() => choose(i)}>
                {c}
              </button>
            );
          })}
        </div>
        {revealed && <p className={styles.explain}>{item.explain}</p>}
      </motion.div>
      <div className={styles.actions}>
        <button className={styles.btn} type="button" onClick={next} disabled={!revealed}>
          {index + 1 >= items.length ? "See my skill grid" : "Next"}
        </button>
        <button className={styles.ghost} type="button" onClick={() => finish(true)}>
          Skip warm-up
        </button>
      </div>
    </div>
  );
}
