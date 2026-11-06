import { SignIn } from "@clerk/react";
import { Link } from "react-router-dom";
import styles from "./Auth.module.css";

export function SignInPage() {
  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/">
        ← Math Builder
      </Link>
      <div className={styles.frame}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/home"
        />
      </div>
    </div>
  );
}
