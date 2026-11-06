import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import styles from "./Landing.module.css";

export function Landing() {
  return (
    <section className={styles.hero} aria-label="Math Builder">
      <div className={styles.inner}>
        <motion.p
          className={styles.kicker}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          Heroes Academy
        </motion.p>
        <motion.h1
          className={styles.brand}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          Math Builder
        </motion.h1>
        <motion.p
          className={styles.line}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          Real decisions. Real numbers. Defend a call — and leave knowing you can take on a messy
          problem.
        </motion.p>
        <motion.div
          className={styles.ctaRow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Show when="signed-out">
            <SignUpButton mode="modal" forceRedirectUrl="/home">
              <button type="button" className={styles.cta}>
                Create account →
              </button>
            </SignUpButton>
            <SignInButton mode="modal" forceRedirectUrl="/home">
              <button type="button" className={styles.secondary}>
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link className={styles.cta} to="/home">
              Open my desk →
            </Link>
          </Show>
        </motion.div>
      </div>
    </section>
  );
}
