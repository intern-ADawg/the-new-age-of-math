import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { getCase } from "../data/cases";
import { flagsFromProgress, JourneyStrip } from "../components/JourneyStrip";
import { ProgressRing } from "../components/ProgressRing";
import { JOURNEY_STAGES, NEXT_TEXT } from "../lib/journey";
import { useStudent } from "../lib/StudentContext";
import styles from "./StudentHome.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

export function StudentHome() {
  const { state, loading, error, setGoal, refresh } = useStudent();
  const [goalDraft, setGoalDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  if (loading) {
    return (
      <div className={styles.loading}>
        <motion.div
          className={styles.loadingPulse}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <p>Opening your desk…</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className={styles.panel}>
        <h2>Couldn’t load your desk</h2>
        <p className={styles.ask}>{error || "No student state yet."}</p>
        <button type="button" className={styles.primary} onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  const first = state.learner.display_name.split(" ")[0] || "Hero";
  const mine = state.assignments;
  const featured =
    [...mine]
      .filter((a) => !a.progress.submitted)
      .sort((a, b) =>
        String(b.progress.updated || "").localeCompare(String(a.progress.updated || "")),
      )[0] || mine[0];
  const featuredFlags = featured ? flagsFromProgress(featured.progress) : null;
  const goalValue = goalDraft || state.learner.weekly_goal;

  async function saveGoal(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setGoal(goalValue.trim());
      setFlash("Goal saved.");
      setTimeout(() => setFlash(""), 3000);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.desk}>
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
      >
        <p className={styles.eyebrow}>Acton Academy · Heroes Discovery Studio</p>
        <h1 className={styles.hello}>Hi, {first}</h1>
        <p className={styles.blurb}>
          {state.stats.going
            ? `You have ${state.stats.going} case${state.stats.going === 1 ? "" : "s"} in motion. Story first, then warm-up.`
            : state.stats.complete
              ? "Nice work — open Cases when your guide assigns the next one."
              : "Your first case is ready. Every one starts with a short story."}
        </p>
        <div className={styles.stats}>
          {[
            [state.stats.complete, "complete"],
            [state.stats.going, "in progress"],
            [state.stats.warmed, "warmed up"],
            [`${state.stats.badges}/${state.stats.badges_total}`, "badges"],
          ].map(([value, label], i) => (
            <motion.div
              key={String(label)}
              className={styles.stat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease }}
            >
              <b>{value}</b>
              <span>{label}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {flash && (
        <motion.p
          className={styles.flash}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {flash}
        </motion.p>
      )}

      {featured && featuredFlags && (
        <motion.section
          className={styles.panel}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease }}
        >
          <div className={styles.panelHead}>
            <h2>Pick up where you left off</h2>
          </div>
          <div className={styles.continue}>
            <div className={styles.continueCopy}>
              <span className={styles.tag}>
                {featured.progress.submitted
                  ? "Submitted"
                  : featuredFlags.count
                    ? "In progress"
                    : "Ready to start"}
              </span>
              <h3 className={styles.caseTitle}>{featured.case_title}</h3>
              <p className={styles.nextStep}>
                <strong>Next:</strong> {NEXT_TEXT[featuredFlags.next]}
              </p>
              <JourneyStrip progress={featured.progress} />
              <div className={styles.ctaRow}>
                {featured.interactiveHref ? (
                  <Link className={styles.primary} to={featured.interactiveHref}>
                    {featuredFlags.count ? "Continue" : "Start"} →
                  </Link>
                ) : (
                  <span className={styles.hint}>Ask your guide for materials.</span>
                )}
              </div>
            </div>
            <div className={styles.side}>
              <ProgressRing
                value={Math.round((featuredFlags.count / JOURNEY_STAGES.length) * 100)}
                size={132}
                label={`${featuredFlags.count}/${JOURNEY_STAGES.length}`}
              />
            </div>
          </div>
        </motion.section>
      )}

      <motion.section
        className={styles.panel}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.45, ease }}
      >
        <div className={styles.panelHead}>
          <h2>Your cases</h2>
          <span className={styles.tag}>Assigned to you</span>
        </div>
        <div className={styles.caseGrid}>
          {mine.map((a, i) => {
            const meta = getCase(a.case_id);
            const flags = flagsFromProgress(a.progress);
            return (
              <motion.article
                key={a.case_id}
                className={styles.caseCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i + 0.18, duration: 0.4, ease }}
                whileHover={{ y: -3 }}
              >
                <div
                  className={styles.art}
                  style={{
                    background: `linear-gradient(135deg, ${
                      ["#6366f1,#a855f7", "#0ea5e9,#6366f1", "#f59e0b,#ec4899"][i % 3]
                    })`,
                  }}
                />
                <div className={styles.caseBody}>
                  <div className={styles.caseHd}>
                    <div>
                      <h3>{a.case_title}</h3>
                      <p className={styles.metaLine}>
                        {meta?.tag || "Case"}
                        {meta?.complexity ? ` · ${"★".repeat(meta.complexity)}` : ""}
                      </p>
                    </div>
                    <span className={styles.tag}>{a.status}</span>
                  </div>
                  <JourneyStrip progress={a.progress} />
                  {meta?.ask && <p className={styles.ask}>{meta.ask}</p>}
                  <div className={styles.ctaRow}>
                    {a.interactiveHref ? (
                      <Link className={styles.primary} to={a.interactiveHref}>
                        {a.progress.submitted
                          ? "Revisit"
                          : flags.count
                            ? "Continue"
                            : "Start"}{" "}
                        →
                      </Link>
                    ) : (
                      <span className={styles.hint}>Materials pending</span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        className={styles.panel}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.45, ease }}
      >
        <div className={styles.panelHead}>
          <h2>Badges</h2>
        </div>
        <div className={styles.badgeRow}>
          {state.stats.badge_names.map((name, i) => (
            <motion.div
              key={name}
              className={styles.badge}
              data-on={i < state.stats.badges ? "1" : "0"}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i + 0.25, duration: 0.35, ease }}
            >
              <span>{i < state.stats.badges ? "★" : "☆"}</span>
              {name}
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className={styles.panel}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease }}
      >
        <div className={styles.panelHead}>
          <h2>This week’s goal</h2>
        </div>
        <form className={styles.goalForm} onSubmit={saveGoal}>
          <input
            className={styles.goalInput}
            value={goalValue}
            onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="e.g. Finish Driving Age story, warm-up, and submit"
          />
          <button type="submit" className={styles.primary} disabled={saving}>
            {saving ? "Saving…" : "Save goal"}
          </button>
        </form>
      </motion.section>
    </div>
  );
}
