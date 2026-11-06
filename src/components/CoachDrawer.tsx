import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { logEvent } from "../lib/events";
import styles from "./CoachDrawer.module.css";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  caseTitle: string;
  caseId: string;
  learnerName: string;
};

export function CoachDrawer({ caseTitle, caseId, learnerName }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm Coach — I won't solve the case for you. Tell me your method in one sentence, and I'll ask one sharp question.",
    },
  ]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    logEvent({
      learner: learnerName,
      caseId,
      type: "coach_message",
      payload: { text: text.slice(0, 400) },
    });
    try {
      const data = await api<{ reply?: string }>("/api/coach", {
        method: "POST",
        json: {
          caseId,
          caseTitle,
          messages: next,
          step: { title: caseTitle, goal: "Defend a binary policy choice with math" },
        },
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "Try walking me through one calculation." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't reach the coach service. Name the quantity you're solving for, then which table you need first.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        className={styles.fab}
        onClick={() => {
          setOpen(true);
          logEvent({ learner: learnerName, caseId, type: "coach_opened" });
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        Ask Coach
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className={styles.panel}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              aria-label="Coach chat"
            >
              <div className={styles.head}>
                <h2>Coach</h2>
                <button
                  type="button"
                  className={styles.close}
                  onClick={() => setOpen(false)}
                  aria-label="Close coach"
                >
                  ✕
                </button>
              </div>
              <p className={styles.hint}>
                Socratic help only — no answers handed over. Case: {caseTitle}
              </p>
              <div className={styles.messages}>
                {messages.map((m, i) => (
                  <div
                    key={`${i}-${m.role}`}
                    className={`${styles.bubble} ${
                      m.role === "user" ? styles.user : styles.assistant
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
              <form className={styles.form} onSubmit={send}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What's your method?"
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()}>
                  Send
                </button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
