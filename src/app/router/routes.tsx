import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { ForgotPasswordPage } from "../../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../../features/auth/ResetPasswordPage";
import { SignUpPage } from "../../features/auth/SignUpPage";
import { ActivatePage } from "../../features/auth/ActivatePage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { SecurityPage } from "../../features/security/SecurityPage";
import { MfaSetupPage } from "../../features/security/MfaSetupPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { ExpenseListPage } from "../../features/expenses/ExpenseListPage";
import { ExpenseDetailsPage } from "../../features/expenses/ExpenseDetailsPage";
import { SubmitExpensePage } from "../../features/expenses/SubmitExpensePage";
import { BudgetsPage } from "../../features/budgets/BudgetsPage";
import { ReportsPage } from "../../features/reports/ReportsPage";
import { AlertsPage } from "../../features/notifications/AlertsPage";
import { SettingsPage } from "../../features/settings/SettingsPage";
import { useDemoSeeder } from "../providers/DemoSeederProvider";

const PROTECTED_PATHS = [
  "/",
  "/security",
  "/security/mfa-setup",
  "/expenses",
  "/expenses/mine",
  "/expenses/pending",
  "/expenses/new",
  "/budgets",
  "/reports",
  "/alerts",
  "/settings"
];

function isProtected(path: string): boolean {
  if (PROTECTED_PATHS.includes(path)) return true;
  if (path.startsWith("/expenses/")) return true; // expense detail
  return false;
}

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/forgot-password") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <ForgotPasswordPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/reset-password") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <ResetPasswordPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/signup") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <SignUpPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/activate") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <ActivatePage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (!isProtected(path)) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <AppShell activePath={path} onNavigate={navigate}>
        <ProtectedContent path={path} navigate={navigate} />
      </AppShell>
    </RequireAuth>
  );
}

function ProtectedContent({ path, navigate }: { path: string; navigate: (next: string) => void }) {
  // Trigger demo data seed on first authenticated mount.
  useDemoSeeder();

  if (path === "/") return <DashboardPage onNavigate={navigate} />;
  if (path === "/security") return <SecurityPage onNavigate={navigate} />;
  if (path === "/security/mfa-setup") return <MfaSetupPage onNavigate={navigate} />;
  if (path === "/expenses") return <ExpenseListPage tab="all" onNavigate={navigate} />;
  if (path === "/expenses/mine") return <ExpenseListPage tab="mine" onNavigate={navigate} />;
  if (path === "/expenses/pending") return <ExpenseListPage tab="pending" onNavigate={navigate} />;
  if (path === "/expenses/new") return <SubmitExpensePage onNavigate={navigate} />;
  if (path.startsWith("/expenses/")) {
    const id = path.slice("/expenses/".length);
    return <ExpenseDetailsPage expenseId={id} onNavigate={navigate} />;
  }
  if (path === "/budgets") return <BudgetsPage />;
  if (path === "/reports") return <ReportsPage />;
  if (path === "/alerts") return <AlertsPage />;
  if (path === "/settings") return <SettingsPage />;
  return <ErrorPage onNavigate={navigate} />;
}
