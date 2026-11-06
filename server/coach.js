import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

function localCoach(payload) {
  const step = payload.step || {};
  const title = String(step.title || "this step");
  const messages = payload.messages || [];
  let user = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      user = (messages[i].content || "").trim();
      break;
    }
  }
  const low = user.toLowerCase();
  const fail = Number(payload.failCount || 0);
  if (!/\d/.test(user) && fail < 1) {
    return `Before I help on ${title}: tell me the method you used — not just a guess. What quantity are you solving for?`;
  }
  if (low.includes("stuck") || fail >= 2) {
    return `On ${title}: name the one quantity this step asks for in plain words. Then point to which fact or table you need first.`;
  }
  if (low.includes("method") || low.includes("check")) {
    return "Walk me through the first multiply or add you did — and where the case says that rule lives.";
  }
  return `You're on ${title}. I won't give the answer. Tell me your method in one short sentence and I'll ask one question.`;
}

export function coachSystem(payload) {
  const step = payload.step || {};
  const caseTitle = String(payload.caseTitle || payload.caseId || "Case");
  const fail = Number(payload.failCount || 0);
  const inputs = step.inputs || {};
  return `You are Coach.AI inside Math Builder.
You help a student through a real-world math case study WITHOUT solving it for them.

Case: ${caseTitle}
Current step: ${step.title || "(unknown)"}
Step goal: ${step.goal || ""}
Student field values: ${JSON.stringify(inputs).slice(0, 500)}
Failed help turns: ${fail}

RULES:
1. Never reveal the correct answer or a formula that directly yields it.
2. Ask for the METHOD, not the number. One question per turn.
3. After two failed turns, offer a worked analogue with DIFFERENT numbers.
Tone: clear, encouraging. Under 70 words unless giving an analogue.`;
}

function chatMessages(payload) {
  const messages = [{ role: "system", content: coachSystem(payload) }];
  for (const m of (payload.messages || []).slice(-8)) {
    if ((m.role === "user" || m.role === "assistant") && m.content) {
      messages.push({ role: m.role, content: String(m.content).slice(0, 1200) });
    }
  }
  return messages;
}

function transcript(payload) {
  return (payload.messages || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${String(m.content).slice(0, 1200)}`)
    .join("\n");
}

async function openrouterCoach(payload) {
  const key = process.env.OPENROUTER_API_KEY || "";
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://127.0.0.1:5173",
        "X-Title": "New Age of Math · Coach",
      },
      body: JSON.stringify({
        model,
        messages: chatMessages(payload),
        temperature: 0.4,
        max_tokens: 280,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, err: `${res.status} ${text.slice(0, 200)}`, via: "openrouter" };
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false, err: "empty_reply", via: "openrouter" };
    return { ok: true, reply, via: "openrouter" };
  } catch (e) {
    return { ok: false, err: String(e), via: "openrouter" };
  }
}

async function geminiCoach(payload) {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    "";
  if (!key) return null;
  const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  try {
    const google = createGoogleGenerativeAI({ apiKey: key });
    const { text } = await generateText({
      model: google(modelId),
      system: coachSystem(payload),
      prompt: transcript(payload) || "Student just opened Coach.",
      temperature: 0.4,
      maxOutputTokens: 280,
    });
    const reply = text.trim();
    if (!reply) return { ok: false, err: "empty_reply", via: "gemini" };
    return { ok: true, reply, via: "gemini" };
  } catch (e) {
    return { ok: false, err: String(e), via: "gemini" };
  }
}

/** OpenRouter free → Gemini → local rules. */
export async function runCoach(payload) {
  const or = await openrouterCoach(payload);
  if (or?.ok) return { reply: or.reply, via: or.via };

  const gem = await geminiCoach(payload);
  if (gem?.ok) return { reply: gem.reply, via: gem.via, err: or?.err };

  return {
    reply: localCoach(payload),
    via: "local",
    err: gem?.err || or?.err || "no_key",
  };
}

export function coachLabel() {
  if (process.env.OPENROUTER_API_KEY) return "openrouter→gemini→local";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "gemini→local";
  }
  return "local";
}
