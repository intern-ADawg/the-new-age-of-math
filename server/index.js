import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import { coachLabel } from "./coach.js";
import { ensureSchema } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const PORT = Number(process.env.PORT || 5174);

async function boot() {
  try {
    if (process.env.DATABASE_URL) await ensureSchema();
  } catch (e) {
    console.error("DB schema:", e instanceof Error ? e.message : e);
  }
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Math Builder API http://127.0.0.1:${PORT}`);
    console.log(`Coach: ${coachLabel()}`);
    console.log(`DB: ${process.env.DATABASE_URL ? "Neon" : "missing"}`);
    console.log(`Clerk: ${process.env.CLERK_SECRET_KEY ? "configured" : "missing"}`);
  });
}

boot();
