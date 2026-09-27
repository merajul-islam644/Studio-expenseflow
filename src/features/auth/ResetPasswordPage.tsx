import { useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { AuthScreen } from "./AuthScreen";

function getCodeFromUrl(): string {
  return new URLSearchParams(window.location.search).get("code") || "";
}

export function ResetPasswordPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [code] = useState(getCodeFromUrl);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code) {
      setError("Missing reset code. Open the link from your email.");
      return;
    }
    if (mismatch) {
      setError("Passwords don't match.");
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.auth.resetPassword({ code, password });
      setDone(true);
    } catch (caught) {
      setError((caught as Error).message || "Password reset failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen onNavigate={onNavigate}>
      <div>
        <h2>{t("auth.reset.title")}</h2>
        <p>{t("auth.reset.subtitle")}</p>
      </div>
      {done ? (
        <>
          <Alert tone="success">{t("auth.reset.success")}</Alert>
          <button className="primary-button auth-submit" onClick={() => onNavigate("/login")}>
            {t("common.continue")}
          </button>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {!code ? <Alert tone="warn">{t("auth.activate.expired")}</Alert> : null}
          <FormField
            label={t("security.password.new")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={pending}
            minLength={8}
          />
          <FormField
            label={t("security.password.confirm")}
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
            {pending ? t("common.loading") : t("auth.reset.submit")}
          </button>
        </form>
      )}
    </AuthScreen>
  );
}
