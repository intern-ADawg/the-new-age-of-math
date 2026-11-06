import { Show, SignInButton, UserButton } from "@clerk/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import styles from "./Shell.module.css";

export function Shell() {
  const location = useLocation();
  const hideTop =
    location.pathname === "/" ||
    location.pathname.startsWith("/case/") ||
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sign-up");

  return (
    <div className={styles.shell}>
      {!hideTop && (
        <header className={styles.top}>
          <div className={styles.inner}>
            <NavLink to="/home" className={styles.brand}>
              <span className={styles.mark} aria-hidden>
                Σ
              </span>
              Math Builder
            </NavLink>
            <nav className={styles.nav}>
              <Show when="signed-in">
                <NavLink
                  to="/home"
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  Desk
                </NavLink>
                <NavLink
                  to="/catalog"
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  Cases
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  Journey
                </NavLink>
                <UserButton />
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button type="button" className={styles.ghost}>
                    Sign in
                  </button>
                </SignInButton>
              </Show>
            </nav>
          </div>
        </header>
      )}
      <main className={hideTop ? styles.mainBare : styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
