import { verifyToken } from "@clerk/backend";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    if (!process.env.CLERK_SECRET_KEY) {
      res.status(500).json({ error: "CLERK_SECRET_KEY missing" });
      return;
    }
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.userId = payload.sub;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
