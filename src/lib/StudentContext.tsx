import { useAuth, useUser } from "@clerk/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setApiTokenGetter } from "./api";

export type Assignment = {
  case_id: string;
  case_title: string;
  status: string;
  assigned_on?: string;
  due_on?: string | null;
  pick?: string | null;
  progress: {
    story: boolean;
    skill: boolean;
    read: boolean;
    notebook: boolean;
    decision: boolean;
    submitted: boolean;
    updated?: string;
  };
  interactiveHref: string | null;
};

export type StudentState = {
  learner: {
    id: string;
    display_name: string;
    email?: string | null;
    weekly_goal: string;
  };
  assignments: Assignment[];
  stats: {
    complete: number;
    going: number;
    warmed: number;
    badges: number;
    badges_total: number;
    badge_names: string[];
  };
};

type Ctx = {
  state: StudentState | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setGoal: (goal: string) => Promise<void>;
};

const StudentContext = createContext<Ctx | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<StudentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setApiTokenGetter(() => getToken());
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !user) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const displayName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.primaryEmailAddress?.emailAddress ||
        "Hero";
      const next = await api<StudentState>("/api/student/bootstrap", {
        method: "POST",
        json: {
          displayName,
          email: user.primaryEmailAddress?.emailAddress || null,
        },
      });
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    if (!isLoaded) return;
    void refresh();
  }, [isLoaded, refresh]);

  const setGoal = useCallback(
    async (goal: string) => {
      await api("/api/student/goal", { method: "POST", json: { goal } });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ state, loading, error, refresh, setGoal }),
    [state, loading, error, refresh, setGoal],
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used within StudentProvider");
  return ctx;
}
