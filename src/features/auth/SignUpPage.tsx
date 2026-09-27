import { useEffect, useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { AuthScreen } from "./AuthScreen";

function readSignupSettings(): Promise<{ allowed: boolean; message?: string }> {
  return blocksClient.iam.signupSettings.get().then((settings) => {
    const allowed = settings?.isEmailPasswordSignUpEnabled === true || settings?.isSignUpEnable === true;
    return { allowed };
  }).catch(() => ({ allowed: false }));
}

function readEmailAvailable(email: string): Promise<boolean> {
  if (!email) return Promise.resolve(true);
  return blocksClient.iam.users.emailAvailable({ email }).then((response) => {
    if (typeof response?.isAvailable === "boolean") return response.isAvailable;
    if (typeof response?.IsAvailable === "boolean") return response.IsAvailable;
    return true;
  }).catch(() => true);
}

export function SignUpPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [allowed, setAllowed] = useState<boolean | undefined>();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    readSignupSettings().then((result) => {
      if (!cancelled) setAllowed(result.allowed);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      readEmailAvailable(email).then((available) => {
        if (!cancelled) setEmailAvailable(available);
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [email]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.auth.signup({ email, password, firstName, lastName });
      setDone(true);
    } catch (caught) {
      setError((caught as Error).message || "Sign up failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen onNavigate={onNavigate}>
      <div>
        <h2>{t("auth.signup.title")}</h2>
        <p>{t("auth.signup.subtitle")}</p>
      </div>
      {allowed === false ? (
        <Alert tone="info">Sign-up is currently closed for this organization. Ask your admin for an invite.</Alert>
      ) : done ? (
        <Alert tone="success">{t("auth.signup.success")}</Alert>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <FormField
              label="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              disabled={pending}
            />
            <FormField
              label="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <FormField
            label="Work email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={pending}
          />
          {emailAvailable === false ? (
            <small className="form-field-error">That email is already registered.</small>
          ) : null}
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={pending}
            minLength={8}
          />
          <button type="submit" className="primary-button auth-submit" disabled={pending || !email || !password || !firstName || !lastName || emailAvailable === false}>
            {pending ? t("common.loading") : t("auth.signup.submit")}
          </button>
        </form>
      )}
    </AuthScreen>
  );
}
