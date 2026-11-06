import { useUser } from "@clerk/react";
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  APPENDIX_B,
  evaluate,
  evaluateTwist,
  near,
} from "../../cases/driving-age/model";
import { CaseWarmup } from "../../components/CaseWarmup";
import { CoachDrawer } from "../../components/CoachDrawer";
import { StoryVideo } from "../../components/StoryVideo";
import { OVERVIEW_PARAS, TWIST_PARAS } from "../../data/drivingAgeStory";
import { api } from "../../lib/api";
import { logEvent } from "../../lib/events";
import { getProgress, markOpened, markSubmitted, updateProgress } from "../../lib/storage";
import { syncProgress } from "../../lib/syncProgress";
import styles from "./CaseWork.module.css";

const TABS = [
  { id: "overview", label: "Story" },
  { id: "warmup", label: "Warm-up" },
  { id: "dilemma", label: "Dilemma" },
  { id: "data", label: "Data" },
  { id: "notebook", label: "Notebook" },
  { id: "twist", label: "Twist" },
  { id: "submit", label: "Submit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DrivingAgeWork() {
  const { user, isLoaded } = useUser();
  const learnerName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "Hero";
  const progress = getProgress("driving-age");
  const [tab, setTab] = useState<TabId>("overview");
  const [pick, setPick] = useState<"A" | "B" | null>(() => {
    try {
      const v = localStorage.getItem("driving-age_pick");
      return v === "A" || v === "B" ? v : null;
    } catch {
      return null;
    }
  });

  const [d1, setD1] = useState<Record<number, string>>({});
  const [d1Fb, setD1Fb] = useState<"ok" | "bad" | null>(null);
  const [d2, setD2] = useState({ m: "", b: "", p155: "", p18: "" });
  const [d2Fb, setD2Fb] = useState<"ok" | "bad" | null>(null);
  const [d3, setD3] = useState({ x1: "", y1: "", x2: "", y2: "", m: "", b: "" });
  const [d3Fb, setD3Fb] = useState<"ok" | "bad" | null>(null);
  const [miles, setMiles] = useState(6000);
  const [d4, setD4] = useState({ a: "", b: "" });
  const [d4Fb, setD4Fb] = useState<"ok" | "bad" | null>(null);
  const [twistOpen, setTwistOpen] = useState(false);
  const [twistOn, setTwistOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [receipt, setReceipt] = useState<string | null>(progress.receiptId ?? null);

  const twistNote = useMemo(
    () => (twistOn ? evaluateTwist({}).twist_note : ""),
    [twistOn],
  );

  if (!isLoaded) return null;
  if (!user) return <Navigate to="/sign-in" replace />;

  function go(id: TabId) {
    setTab(id);
    markOpened("driving-age");
    if (id === "dilemma" || id === "data" || id === "notebook") {
      void syncProgress("driving-age", { read: true });
    }
    if (id === "notebook") void syncProgress("driving-age", { notebook: true });
  }

  function choose(side: "A" | "B") {
    setPick(side);
    localStorage.setItem("driving-age_pick", side);
    updateProgress("driving-age", { status: "in-progress" });
    void syncProgress("driving-age", { decision: true, read: true, pick: side });
    logEvent({
      learner: learnerName,
      caseId: "driving-age",
      type: "step_attempt",
      payload: { pick: side },
    });
  }

  function checkD1() {
    const ages = [14, 15, 16, 17, 18, 19];
    const ok = ages.every((a) => near(parseFloat(d1[a] || "NaN"), APPENDIX_B[a], 0.05));
    setD1Fb(ok ? "ok" : "bad");
    logEvent({
      learner: learnerName,
      caseId: "driving-age",
      step: "d1",
      type: "step_attempt",
      payload: { ok },
    });
  }

  function checkD2() {
    const m = parseFloat(d2.m);
    const b = parseFloat(d2.b);
    const p155 = parseFloat(d2.p155);
    const p18 = parseFloat(d2.p18);
    if ([m, b, p155, p18].some(isNaN)) {
      setD2Fb("bad");
      return;
    }
    const ok = near(p155, m * 15.5 + b, 0.15) && near(p18, m * 18 + b, 0.15);
    setD2Fb(ok ? "ok" : "bad");
    logEvent({
      learner: learnerName,
      caseId: "driving-age",
      step: "d2",
      type: "step_attempt",
      payload: { ok },
    });
  }

  function checkD3() {
    const x1 = parseFloat(d3.x1);
    const y1 = parseFloat(d3.y1);
    const x2 = parseFloat(d3.x2);
    const y2 = parseFloat(d3.y2);
    const m = parseFloat(d3.m);
    const b = parseFloat(d3.b);
    if ([x1, y1, x2, y2, m, b].some(isNaN) || x1 === x2) {
      setD3Fb("bad");
      return;
    }
    const expectM = (y2 - y1) / (x2 - x1);
    const expectB = y1 - expectM * x1;
    const ok = near(m, expectM, 0.05) && near(b, expectB, 0.3);
    setD3Fb(ok ? "ok" : "bad");
    logEvent({
      learner: learnerName,
      caseId: "driving-age",
      step: "d3",
      type: "step_attempt",
      payload: { ok },
    });
  }

  function checkD4() {
    const a = parseFloat(d4.a);
    const b = parseFloat(d4.b);
    if (isNaN(a) || isNaN(b)) {
      setD4Fb("bad");
      return;
    }
    const expect = evaluate({ chauffeuring_miles_per_year: miles });
    const ok = near(a, expect.A, 1) && near(b, expect.B, 1);
    setD4Fb(ok ? "ok" : "bad");
    logEvent({
      learner: learnerName,
      caseId: "driving-age",
      step: "d4",
      type: "step_attempt",
      payload: { ok, miles },
    });
  }

  async function submitWork() {
    setErr("");
    if (!pick) {
      setErr("Pick AYE or NAY on the Dilemma tab before submitting.");
      setTab("dilemma");
      return;
    }
    setBusy(true);
    try {
      const work = {
        pick,
        d1,
        d2,
        d3,
        d4: { ...d4, miles },
        checks: { d1: d1Fb, d2: d2Fb, d3: d3Fb, d4: d4Fb },
        twistApplied: twistOn,
      };
      const data = await api<{ id: string }>("/api/submit", {
        method: "POST",
        json: {
          case_id: "driving-age",
          student_name: learnerName,
          pick,
          work,
        },
      });
      markSubmitted("driving-age", data.id);
      void syncProgress("driving-age", { submitted: true, decision: true, pick });
      logEvent({
        learner: learnerName,
        caseId: "driving-age",
        type: "submit",
        payload: { id: data.id, pick },
      });
      setReceipt(data.id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.wrap}>
          <Link className={styles.back} to="/home">
            ← Home
          </Link>
          <p className={styles.meta}>MS · Math · Case Study · Statistics</p>
          <h1>Case Study: Driving Age</h1>
          <div className={styles.pillbar}>
            <span className={styles.pill}>State Legislator</span>
            <span className={styles.pill}>Scatter · Fit · Slope</span>
            <span className={styles.pill}>
              {pick ? `Current pick: ${pick}` : "No pick yet"}
            </span>
            {receipt && <span className={styles.pill}>Submitted</span>}
          </div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Case chapters">
        <div className={styles.tabsInner}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? styles.tabActive : undefined}
              onClick={() => go(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "overview" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>1</span> The story
          </h2>
          <p className={styles.lede}>
            Watch the stick-figure story — or read it instead. Same words as the case, acted out.
          </p>
          <StoryVideo
            seed="driving-age"
            paragraphs={OVERVIEW_PARAS}
            playLabel="Watch the story"
            onWatched={() => void syncProgress("driving-age", { story: true })}
          />
          <div className={styles.nextBar}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                void syncProgress("driving-age", { story: true });
                go("warmup");
              }}
            >
              Next: Warm-up →
            </button>
          </div>
        </section>
      )}

      {tab === "warmup" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>2</span> Skill warm-up
          </h2>
          <CaseWarmup
            caseId="driving-age"
            learnerName={learnerName}
            onDone={() => go("dilemma")}
          />
          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("overview")}>
              ← Story
            </button>
          </div>
        </section>
      )}

      {tab === "dilemma" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>3</span> Dilemma
          </h2>
          <p>You are Congresswoman Olivia Edmunds. Do you:</p>
          <div className={styles.grid2}>
            <button
              type="button"
              className={`${styles.option} ${pick === "A" ? styles.picked : ""}`}
              onClick={() => choose("A")}
            >
              <h4>A.) Vote AYE</h4>
              <p>Raise the minimum driving age to 18 under HB 3320.</p>
            </button>
            <button
              type="button"
              className={`${styles.option} ${pick === "B" ? styles.picked : ""}`}
              onClick={() => choose("B")}
            >
              <h4>B.) Vote NAY</h4>
              <p>Keep Arizona’s current minimum of 15½.</p>
            </button>
          </div>
          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("warmup")}>
              ← Warm-up
            </button>
            <button type="button" className={styles.btn} onClick={() => go("data")}>
              Next: Data →
            </button>
          </div>
        </section>
      )}

      {tab === "data" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>4</span> Data
          </h2>
          <details className={styles.details} open>
            <summary>Appendix B — Fatal crash involvement by driver age</summary>
            <div className={styles.inner}>
              <p className={styles.goal}>
                Deaths per 100,000 people by age (IIHS). Plot ages 14–19 for your scatterplot.
              </p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Age</th>
                    <th className={styles.num}>All drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(APPENDIX_B).map(([age, rate]) => (
                    <tr key={age}>
                      <td>{age}</td>
                      <td className={styles.num}>{rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details className={styles.details}>
            <summary>Appendix C — Two-year cost figures</summary>
            <div className={styles.inner}>
              <p>
                Adding a 16-year-old raises average annual premium by <strong>$4,050</strong>. AAA
                fully-loaded cost per mile: <strong>$0.6637</strong>. Delay window:{" "}
                <strong>2 years</strong> (16 → 18).
              </p>
              <p style={{ marginBottom: 0 }}>
                MA1 (modeling assumption): extra chauffeuring miles/year — default{" "}
                <strong>6,000</strong> (flex in Notebook Step 4).
              </p>
            </div>
          </details>
          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("dilemma")}>
              ← Dilemma
            </button>
            <button type="button" className={styles.btn} onClick={() => go("notebook")}>
              Next: Notebook →
            </button>
          </div>
        </section>
      )}

      {tab === "notebook" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>5</span> Working Notebook
          </h2>
          <p className={styles.goal}>
            Enter your numbers, then Check — it won’t tell you which option to choose.
          </p>

          <div className={styles.stepbox}>
            <h4>Step 1 — Transcribe scatterplot data (D1)</h4>
            <p className={styles.goal}>Copy Appendix B ages 14–19 into the boxes.</p>
            {[14, 15, 16, 17, 18, 19].map((age) => (
              <div className={styles.fields} key={age}>
                <label>Age {age} rate</label>
                <input
                  type="number"
                  step="0.1"
                  value={d1[age] || ""}
                  onChange={(e) => setD1((s) => ({ ...s, [age]: e.target.value }))}
                />
              </div>
            ))}
            <button type="button" className={styles.btn} onClick={checkD1}>
              Check
            </button>
            {d1Fb && (
              <span className={`${styles.fb} ${d1Fb === "ok" ? styles.fbOk : styles.fbBad}`}>
                {d1Fb === "ok" ? "✓" : "try again"}
              </span>
            )}
          </div>

          <div className={styles.stepbox}>
            <h4>Step 2 — Line of best fit predictions (D2)</h4>
            <p className={styles.goal}>
              Read m and b off your graph; predict rates at 15.5 and 18 with y = mx + b.
            </p>
            <div className={styles.fields}>
              <label>Slope (m)</label>
              <input
                type="number"
                value={d2.m}
                onChange={(e) => setD2({ ...d2, m: e.target.value })}
              />
              <label>Y-intercept (b)</label>
              <input
                type="number"
                value={d2.b}
                onChange={(e) => setD2({ ...d2, b: e.target.value })}
              />
            </div>
            <div className={styles.fields}>
              <label>Pred @ 15.5</label>
              <input
                type="number"
                value={d2.p155}
                onChange={(e) => setD2({ ...d2, p155: e.target.value })}
              />
              <label>Pred @ 18</label>
              <input
                type="number"
                value={d2.p18}
                onChange={(e) => setD2({ ...d2, p18: e.target.value })}
              />
            </div>
            <button type="button" className={styles.btn} onClick={checkD2}>
              Check
            </button>
            {d2Fb && (
              <span className={`${styles.fb} ${d2Fb === "ok" ? styles.fbOk : styles.fbBad}`}>
                {d2Fb === "ok" ? "✓" : "try again"}
              </span>
            )}
          </div>

          <div className={styles.stepbox}>
            <h4>Step 3 — Second equation from two points (D3)</h4>
            <p className={styles.goal}>Pick any two Appendix B rows; show your slope & intercept math.</p>
            <div className={styles.fields}>
              <label>Point 1 age</label>
              <input
                type="number"
                value={d3.x1}
                onChange={(e) => setD3({ ...d3, x1: e.target.value })}
              />
              <label>rate</label>
              <input
                type="number"
                value={d3.y1}
                onChange={(e) => setD3({ ...d3, y1: e.target.value })}
              />
            </div>
            <div className={styles.fields}>
              <label>Point 2 age</label>
              <input
                type="number"
                value={d3.x2}
                onChange={(e) => setD3({ ...d3, x2: e.target.value })}
              />
              <label>rate</label>
              <input
                type="number"
                value={d3.y2}
                onChange={(e) => setD3({ ...d3, y2: e.target.value })}
              />
            </div>
            <div className={styles.fields}>
              <label>Your slope</label>
              <input
                type="number"
                value={d3.m}
                onChange={(e) => setD3({ ...d3, m: e.target.value })}
              />
              <label>Your intercept</label>
              <input
                type="number"
                value={d3.b}
                onChange={(e) => setD3({ ...d3, b: e.target.value })}
              />
            </div>
            <button type="button" className={styles.btn} onClick={checkD3}>
              Check
            </button>
            {d3Fb && (
              <span className={`${styles.fb} ${d3Fb === "ok" ? styles.fbOk : styles.fbBad}`}>
                {d3Fb === "ok" ? "✓" : "try again"}
              </span>
            )}
          </div>

          <div className={styles.stepbox}>
            <h4>Step 4 — Net two-year cost (D4)</h4>
            <p className={styles.goal}>
              Option A = chauffeuring only; Option B = insurance only. Flex MA1 if you challenge it.
            </p>
            <div className={styles.slider}>
              <span>Chauffeuring miles/year (MA1)</span>
              <input
                type="range"
                min={1000}
                max={12000}
                step={250}
                value={miles}
                onChange={(e) => setMiles(Number(e.target.value))}
              />
              <span className={styles.sliderVal}>{miles}</span>
            </div>
            <div className={styles.fields}>
              <label>Option A total</label>
              <input
                type="number"
                value={d4.a}
                onChange={(e) => setD4({ ...d4, a: e.target.value })}
              />
              <label>Option B total</label>
              <input
                type="number"
                value={d4.b}
                onChange={(e) => setD4({ ...d4, b: e.target.value })}
              />
            </div>
            <button type="button" className={styles.btn} onClick={checkD4}>
              Check
            </button>
            {d4Fb && (
              <span className={`${styles.fb} ${d4Fb === "ok" ? styles.fbOk : styles.fbBad}`}>
                {d4Fb === "ok" ? "✓" : "try again"}
              </span>
            )}
          </div>

          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("data")}>
              ← Data
            </button>
            <button type="button" className={styles.btn} onClick={() => go("twist")}>
              Next: Twist →
            </button>
          </div>
        </section>
      )}

      {tab === "twist" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>6</span> Twist
          </h2>
          <p className={styles.toolnote}>
            Ask your facilitator before revealing this — in a live discussion the Twist drops at a
            specific moment.
          </p>
          <div className={styles.twist}>
            <h4>Reveal the Twist</h4>
            {!twistOpen ? (
              <button type="button" className={styles.btnGold} onClick={() => setTwistOpen(true)}>
                I've been told to reveal it
              </button>
            ) : (
              <>
                <StoryVideo
                  seed="driving-age-twist"
                  paragraphs={TWIST_PARAS}
                  label="The twist, acted out by stick figures"
                  playLabel="Watch the twist"
                />
                <label className={styles.chk}>
                  <input
                    type="checkbox"
                    checked={twistOn}
                    onChange={(e) => setTwistOn(e.target.checked)}
                  />
                  <span>
                    Apply the twist: show the per-mile (S8) safety read alongside the population
                    table.
                  </span>
                </label>
                {twistNote && <p>{twistNote}</p>}
              </>
            )}
          </div>
          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("notebook")}>
              ← Notebook
            </button>
            <button type="button" className={styles.btn} onClick={() => go("submit")}>
              Next: Submit →
            </button>
          </div>
        </section>
      )}

      {tab === "submit" && (
        <section className={styles.section}>
          <h2>
            <span className={styles.badge}>7</span> Submit
          </h2>
          <div className={styles.card}>
            <p>
              One click sends your vote and notebook work to your guide. No PDF upload.
            </p>
            <ul style={{ margin: "0 0 16px", paddingLeft: 18, color: "var(--sub)" }}>
              <li>
                Vote:{" "}
                <strong>
                  {pick === "A" ? "AYE (raise to 18)" : pick === "B" ? "NAY (keep 15½)" : "not chosen"}
                </strong>
              </li>
              <li>
                Notebook checks: D1 {d1Fb || "—"} · D2 {d2Fb || "—"} · D3 {d3Fb || "—"} · D4{" "}
                {d4Fb || "—"}
              </li>
              <li>Twist applied: {twistOn ? "yes" : "no"}</li>
            </ul>

            {receipt ? (
              <>
                <div className={styles.fbOk} style={{ display: "block", padding: 12, marginBottom: 12 }}>
                  <strong>Submitted.</strong> Receipt: {receipt}
                </div>
                <div className={styles.nextBar}>
                  <Link className={styles.btn} to="/home">
                    Back to home
                  </Link>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setReceipt(null)}
                  >
                    Submit a revision
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={busy}
                  onClick={submitWork}
                >
                  {busy ? "Submitting…" : "Submit"}
                </button>
                {err && (
                  <p style={{ color: "var(--bad)", fontWeight: 700, marginTop: 12 }}>{err}</p>
                )}
              </>
            )}
          </div>
          <div className={styles.nextBar}>
            <button type="button" className={styles.btnGhost} onClick={() => go("twist")}>
              ← Twist
            </button>
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        Driving Age · Heroes Academy Math Builder
      </footer>

      <CoachDrawer
        caseId="driving-age"
        caseTitle="Driving Age"
        learnerName={learnerName}
      />
    </div>
  );
}
