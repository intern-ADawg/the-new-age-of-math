import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Shell } from "./components/Shell";
import { StudentProvider } from "./lib/StudentContext";
import { Catalog } from "./pages/Catalog";
import { DrivingAgeWork } from "./pages/case/DrivingAgeWork";
import { Landing } from "./pages/Landing";
import { Profile } from "./pages/Profile";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { StudentHome } from "./pages/StudentHome";
import { Warmup } from "./pages/Warmup";

export default function App() {
  return (
    <StudentProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Landing />} />
          <Route path="sign-in/*" element={<SignInPage />} />
          <Route path="sign-up/*" element={<SignUpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="home" element={<StudentHome />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="profile" element={<Profile />} />
            <Route path="warmup/:caseId" element={<Warmup />} />
            <Route path="case/driving-age" element={<DrivingAgeWork />} />
            <Route path="case/:caseId" element={<Navigate to="/case/driving-age" replace />} />
          </Route>
          <Route path="enter" element={<Navigate to="/sign-in" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StudentProvider>
  );
}
