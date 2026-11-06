import { SignUp } from "@clerk/react";
import { Link } from "react-router-dom";
import styles from "./Auth.module.css";

export function SignUpPage() {
  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/">
        ← Math Builder
      </Link>
      <div className={styles.frame}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/home"
        />
      </div>
    </div>
  );
}
