import { useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { AuthScreen } from "./AuthScreen";

function readQuery(): { code: string; email: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get("code") || "",
    email: params.get("email") || ""
  };
}

export function ActivatePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [{ code, email: initialEmail }] = useState(readQuery);
  const [email] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code) {
      setError(t("auth.activate.expired"));
      return;
    }
    if (mismatch) {
      setError("Passwords don't match.");
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.auth.activate({ code, password, email });
      setDone(true);
    } catch (caught) {
      setError((caught as Error).message || t("auth.activate.expired"));
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setPending(true);
    try {
      await blocksClient.auth.resendActivation({ email });
    } catch {
      // Best-effort — surface silently, the page itself is the source of truth.
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen onNavigate={onNavigate}>
      <div>
        <h2>{t("auth.activate.title")}</h2>
        <p>{t("auth.activate.subtitle")}</p>
      </div>
      {done ? (
        <>
          <Alert tone="success">{t("auth.activate.success")}</Alert>
          <button className="primary-button auth-submit" onClick={() => onNavigate("/login")}>
            {t("common.continue")}
          </button>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {!code ? <Alert tone="warn">{t("auth.activate.expired")}</Alert> : null}
          {email ? (
            <FormField
              label="Email"
              type="email"
              value={email}
              readOnly
              disabled
            />
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
          <FormField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            disabled={pending}
            minLength={8}
          />
          {mismatch ? <small className="form-field-error">Passwords don't match.</small> : null}
          <button type="submit" className="primary-button auth-submit" disabled={pending || !password || !confirm || mismatch || !code}>
            {pending ? t("common.loading") : t("auth.activate.submit")}
          </button>
          {email ? (
            <button type="button" className="link-button" onClick={handleResend} disabled={pending}>
              {t("auth.activate.resend")}
            </button>
          ) : null}
        </form>
      )}
    </AuthScreen>
  );
}
