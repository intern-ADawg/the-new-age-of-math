import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "./auth.js";
import { coachLabel, runCoach } from "./coach.js";
import {
  buildStudentState,
  ensureLearner,
  ensureSchema,
  logDbEvent,
  patchProgress,
  saveSubmission,
  setWeeklyGoal,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SUBMISSIONS = path.join(ROOT, "submissions");

function slug(text) {
  return (
    String(text)
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "unknown"
  );
}

const app = express();

const origins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  process.env.APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin) || /\.vercel\.app$/.test(origin || "")) {
        cb(null, true);
      } else {
        cb(null, true); // allow preview URLs
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  let db = "missing";
  try {
    if (process.env.DATABASE_URL) {
      await ensureSchema();
      db = "ok";
    }
  } catch (e) {
    db = e instanceof Error ? e.message : "error";
  }
  res.json({
    ok: true,
    db,
    coach: coachLabel(),
    clerk: process.env.CLERK_SECRET_KEY ? "ok" : "missing",
  });
});

app.post("/api/student/bootstrap", requireAuth, async (req, res) => {
  try {
    const { displayName, email } = req.body || {};
    await ensureLearner(req.userId, { displayName, email });
    const state = await buildStudentState(req.userId);
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "bootstrap failed" });
  }
});

app.get("/api/student/state", requireAuth, async (req, res) => {
  try {
    let state = await buildStudentState(req.userId);
    if (!state) {
      await ensureLearner(req.userId, {
        displayName: "Hero",
        email: null,
      });
      state = await buildStudentState(req.userId);
    }
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "state failed" });
  }
});

app.post("/api/student/goal", requireAuth, async (req, res) => {
  try {
    const goal = String(req.body?.goal || "").trim();
    await setWeeklyGoal(req.userId, goal);
    res.json({ ok: true, goal });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "goal failed" });
  }
});

app.post("/api/student/progress", requireAuth, async (req, res) => {
  try {
    const caseId = String(req.body?.caseId || "").trim();
    if (!caseId) {
      res.status(400).json({ error: "caseId required" });
      return;
    }
    const progress = await patchProgress(req.userId, caseId, req.body || {});
    res.json({ ok: true, progress });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "progress failed" });
  }
});

app.post("/api/events", requireAuth, async (req, res) => {
  try {
    await logDbEvent(req.userId, {
      caseId: req.body?.caseId,
      type: String(req.body?.type || "event"),
      payload: req.body?.payload || req.body || {},
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "log failed" });
  }
});

app.post("/api/coach", requireAuth, async (req, res) => {
  const { reply, err, via } = await runCoach(req.body || {});
  const out = { reply, via };
  if (err && err !== "no_key" && (String(err).includes("402") || /credit|quota|429/i.test(String(err)))) {
    out.reply += "\n\n(Live model hit a limit — using the next coach fallback.)";
  }
  res.json(out);
});

app.post("/api/submit", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const caseId = slug(String(body.case_id || body.caseId || ""));
    const work = body.work || null;
    const pick = body.pick || null;
    const note = String(body.note || body.answer_text || "").trim();

    if (!pick && !work && !note) {
      res.status(400).json({ error: "Nothing to submit — pick a side or finish notebook work" });
      return;
    }

    const row = await saveSubmission(req.userId, { caseId, pick, work, note });

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const id = `${stamp}-${slug(req.userId)}`;
      const folder = path.join(SUBMISSIONS, caseId, id);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(
        path.join(folder, "submission.json"),
        JSON.stringify(
          {
            case_id: caseId,
            clerk_user_id: req.userId,
            pick,
            note,
            work,
            db_id: row.id,
            submitted_at: row.created_at,
          },
          null,
          2,
        ),
      );
    } catch {
      // Serverless filesystems are read-only — Neon row is the source of truth.
    }

    res.json({ ok: true, id: String(row.id) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Submit failed" });
  }
});

export default app;
