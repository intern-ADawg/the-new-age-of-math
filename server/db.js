import { neon } from "@neondatabase/serverless";

let sql = null;
let ready = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    const db = getSql();
    await db`
      CREATE TABLE IF NOT EXISTS learners (
        clerk_user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        weekly_goal TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT NOT NULL REFERENCES learners(clerk_user_id) ON DELETE CASCADE,
        case_id TEXT NOT NULL,
        case_title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'assigned',
        assigned_on DATE NOT NULL DEFAULT CURRENT_DATE,
        due_on DATE,
        UNIQUE (clerk_user_id, case_id)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS case_progress (
        clerk_user_id TEXT NOT NULL REFERENCES learners(clerk_user_id) ON DELETE CASCADE,
        case_id TEXT NOT NULL,
        story BOOLEAN NOT NULL DEFAULT false,
        skill BOOLEAN NOT NULL DEFAULT false,
        read_chapters BOOLEAN NOT NULL DEFAULT false,
        notebook BOOLEAN NOT NULL DEFAULT false,
        decision BOOLEAN NOT NULL DEFAULT false,
        submitted BOOLEAN NOT NULL DEFAULT false,
        pick TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (clerk_user_id, case_id)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT NOT NULL REFERENCES learners(clerk_user_id) ON DELETE CASCADE,
        case_id TEXT NOT NULL,
        pick TEXT,
        work JSONB,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT NOT NULL,
        case_id TEXT,
        type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  })();
  return ready;
}

const DEFAULT_CASES = [
  { id: "driving-age", title: "Driving Age" },
];

export async function ensureLearner(userId, { displayName, email }) {
  await ensureSchema();
  const db = getSql();
  const name = (displayName || "Hero").trim() || "Hero";
  await db`
    INSERT INTO learners (clerk_user_id, display_name, email)
    VALUES (${userId}, ${name}, ${email || null})
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      display_name = COALESCE(NULLIF(${name}, ''), learners.display_name),
      email = COALESCE(${email || null}, learners.email),
      updated_at = now()
  `;
  for (const c of DEFAULT_CASES) {
    await db`
      INSERT INTO assignments (clerk_user_id, case_id, case_title, status)
      VALUES (${userId}, ${c.id}, ${c.title}, 'assigned')
      ON CONFLICT (clerk_user_id, case_id) DO NOTHING
    `;
  }
}

export async function buildStudentState(userId) {
  await ensureSchema();
  const db = getSql();
  const [learner] = await db`
    SELECT clerk_user_id, display_name, email, weekly_goal, created_at
    FROM learners WHERE clerk_user_id = ${userId}
  `;
  if (!learner) return null;

  const assignments = await db`
    SELECT a.case_id, a.case_title, a.status, a.assigned_on, a.due_on,
           p.story, p.skill, p.read_chapters, p.notebook, p.decision, p.submitted, p.pick, p.updated_at
    FROM assignments a
    LEFT JOIN case_progress p
      ON p.clerk_user_id = a.clerk_user_id AND p.case_id = a.case_id
    WHERE a.clerk_user_id = ${userId}
    ORDER BY a.assigned_on ASC, a.id ASC
  `;

  const complete = assignments.filter((a) => a.status === "complete" || a.submitted).length;
  const going = assignments.filter((a) => !(a.status === "complete" || a.submitted)).length;
  const warmed = assignments.filter((a) => a.skill).length;
  const badgesTotal = 4;
  const badgesEarned = Math.min(badgesTotal, Math.floor(complete / 1));

  return {
    learner: {
      id: learner.clerk_user_id,
      display_name: learner.display_name,
      email: learner.email,
      weekly_goal: learner.weekly_goal || "",
    },
    assignments: assignments.map((a) => ({
      case_id: a.case_id,
      case_title: a.case_title,
      status: a.submitted || a.status === "complete" ? "submitted" : a.decision || a.story ? "in-progress" : a.status,
      assigned_on: a.assigned_on,
      due_on: a.due_on,
      pick: a.pick,
      progress: {
        story: !!a.story,
        skill: !!a.skill,
        read: !!a.read_chapters,
        notebook: !!a.notebook,
        decision: !!a.decision,
        submitted: !!a.submitted,
        updated: a.updated_at,
      },
      interactiveHref: a.case_id === "driving-age" ? "/case/driving-age" : null,
    })),
    stats: {
      complete,
      going,
      warmed,
      badges: badgesEarned,
      badges_total: badgesTotal,
      badge_names: ["The Call", "The Threshold", "The Trials", "The Return"],
    },
  };
}

export async function patchProgress(userId, caseId, patch) {
  await ensureSchema();
  const db = getSql();
  const cur = (
    await db`SELECT * FROM case_progress WHERE clerk_user_id = ${userId} AND case_id = ${caseId}`
  )[0];
  const next = {
    story: patch.story ?? cur?.story ?? false,
    skill: patch.skill ?? cur?.skill ?? false,
    read_chapters: patch.read ?? patch.read_chapters ?? cur?.read_chapters ?? false,
    notebook: patch.notebook ?? cur?.notebook ?? false,
    decision: patch.decision ?? cur?.decision ?? false,
    submitted: patch.submitted ?? cur?.submitted ?? false,
    pick: patch.pick ?? cur?.pick ?? null,
    payload: patch.payload ?? cur?.payload ?? {},
  };
  await db`
    INSERT INTO case_progress (
      clerk_user_id, case_id, story, skill, read_chapters, notebook, decision, submitted, pick, payload, updated_at
    ) VALUES (
      ${userId}, ${caseId}, ${next.story}, ${next.skill}, ${next.read_chapters},
      ${next.notebook}, ${next.decision}, ${next.submitted}, ${next.pick},
      ${JSON.stringify(next.payload)}::jsonb, now()
    )
    ON CONFLICT (clerk_user_id, case_id) DO UPDATE SET
      story = EXCLUDED.story,
      skill = EXCLUDED.skill,
      read_chapters = EXCLUDED.read_chapters,
      notebook = EXCLUDED.notebook,
      decision = EXCLUDED.decision,
      submitted = EXCLUDED.submitted,
      pick = EXCLUDED.pick,
      payload = EXCLUDED.payload,
      updated_at = now()
  `;
  if (next.story || next.skill || next.decision || next.notebook) {
    await db`
      UPDATE assignments SET status = 'in_progress'
      WHERE clerk_user_id = ${userId} AND case_id = ${caseId} AND status = 'assigned'
    `;
  }
  if (next.submitted) {
    await db`
      UPDATE assignments SET status = 'submitted'
      WHERE clerk_user_id = ${userId} AND case_id = ${caseId}
    `;
  }
  return next;
}

export async function saveSubmission(userId, { caseId, pick, work, note }) {
  await ensureSchema();
  const db = getSql();
  const rows = await db`
    INSERT INTO submissions (clerk_user_id, case_id, pick, work, note)
    VALUES (${userId}, ${caseId}, ${pick || null}, ${work ? JSON.stringify(work) : null}::jsonb, ${note || null})
    RETURNING id, created_at
  `;
  await patchProgress(userId, caseId, { submitted: true, decision: true, pick: pick || undefined });
  return rows[0];
}

export async function setWeeklyGoal(userId, goal) {
  await ensureSchema();
  const db = getSql();
  await db`
    UPDATE learners SET weekly_goal = ${goal}, updated_at = now()
    WHERE clerk_user_id = ${userId}
  `;
}

export async function logDbEvent(userId, { caseId, type, payload }) {
  await ensureSchema();
  const db = getSql();
  await db`
    INSERT INTO events (clerk_user_id, case_id, type, payload)
    VALUES (${userId}, ${caseId || null}, ${type}, ${JSON.stringify(payload || {})}::jsonb)
  `;
}
