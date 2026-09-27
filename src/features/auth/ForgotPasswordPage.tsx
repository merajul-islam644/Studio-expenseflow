import { useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { AuthScreen } from "./AuthScreen";

export function ForgotPasswordPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.auth.recover({ email });
      setDone(true);
    } catch (caught) {
      // Recover is a public endpoint and intentionally returns no detail
      // about whether the email exists; surface a generic confirmation in
      // every case rather than leaking account enumeration.
      setDone(true);
      setError(undefined);
      void caught;
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen onNavigate={onNavigate}>
      <div>
        <h2>{t("auth.forgot.title")}</h2>
        <p>{t("auth.forgot.subtitle")}</p>
      </div>
      {done ? (
        <Alert tone="success">{t("auth.forgot.sent")}</Alert>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={pending}
          />
          <button type="submit" className="primary-button auth-submit" disabled={pending || !email}>
            {pending ? t("common.loading") : t("auth.forgot.submit")}
          </button>
        </form>
      )}
    </AuthScreen>
  );
}
