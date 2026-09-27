import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { completeLogin } from "../../lib/blocks/auth";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { LoadingScreen } from "../../shared/ui/LoadingScreen";
import { Wallet } from "lucide-react";

export function CallbackPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { refresh } = useAuth();
  const { t } = useT();
  const [error, setError] = useState<string | undefined>();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    completeLogin(window.location.href).then((result) => {
      if (result.ok) {
        refresh();
        onNavigate(result.returnTo);
        return;
      }

      const message = result.message.toLowerCase();
      if (message.includes("mfa_enrollment_required")) {
        // IAM bounced the callback because the org requires MFA and this
        // user has not enrolled yet -- send them straight into the
        // enrollment flow rather than leaving them on a dead error page.
        refresh();
        onNavigate("/security/mfa-setup");
        return;
      }

      setError(result.message);
    });
  }, [onNavigate, refresh]);

  if (error) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark"><Wallet size={18} /></span>
            <span>{t("app.name")}</span>
          </div>
          <h2>{t("auth.failed")}</h2>
          <Alert tone="error">{error}</Alert>
          <button className="primary-button auth-submit" onClick={() => onNavigate("/login")}>{t("auth.back")}</button>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}
