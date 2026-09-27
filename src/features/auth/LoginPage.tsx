import { ArrowRight, LogIn, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { blocksClient } from "../../lib/blocks/client";
import { isLoginConfigured } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";

export function LoginPage({ returnTo, onNavigate }: { returnTo?: string; onNavigate: (path: string) => void }) {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [signupEnabled, setSignupEnabled] = useState(false);
  const { t } = useT();
  const configured = isLoginConfigured();

  useEffect(() => {
    let cancelled = false;
    async function detectSignup() {
      try {
        const settings = await blocksClient.iam.signupSettings.get();
        const value = settings?.isEmailPasswordSignUpEnabled === true || settings?.isSignUpEnable === true;
        if (!cancelled) setSignupEnabled(Boolean(value));
      } catch {
        if (!cancelled) setSignupEnabled(false);
      }
    }
    void detectSignup();
    return () => { cancelled = true; };
  }, []);

  async function handleLogin() {
    setError(undefined);
    setPending(true);
    try {
      await login(returnTo);
    } catch (caught) {
      setError((caught as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark"><Wallet size={18} /></span>
          <span>{t("app.name")}</span>
        </div>
        <div>
          <h2>{t("auth.welcome")}</h2>
          <p>{t("auth.subtitle")}</p>
        </div>
        {!configured ? (
          <Alert tone="warn">
            {t("auth.notConfigured")} <code>{window.location.origin}/login/callback</code>
          </Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={staySignedIn}
            onChange={(event) => setStaySignedIn(event.target.checked)}
          />
          <span>
            {t("auth.staySignedIn")}
            <br />
            <small className="checkbox-help">{t("auth.staySignedInHelp")}</small>
          </span>
        </label>
        <button className="primary-button auth-submit" disabled={!configured || pending} onClick={handleLogin}>
          <LogIn size={18} /> {pending ? t("auth.redirecting") : t("auth.continue")}
        </button>
        <div className="auth-switch">
          <div className="auth-switch-row">
            <button type="button" className="link-button" onClick={() => onNavigate("/forgot-password")}>Forgot password?</button>
            {signupEnabled ? (
              <button type="button" className="link-button" onClick={() => onNavigate("/signup")}>Create account <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /></button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
