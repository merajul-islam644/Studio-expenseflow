import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";

type AuthScreenProps = {
  children: ReactNode;
  onNavigate: (path: string) => void;
  showBackToSignIn?: boolean;
};

export function AuthScreen({ children, onNavigate, showBackToSignIn = true }: AuthScreenProps) {
  const { t } = useT();
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark"><Wallet size={18} /></span>
          <span>{t("app.name")}</span>
        </div>
        {children}
        {showBackToSignIn ? (
          <div className="auth-switch">
            <button type="button" className="link-button" onClick={() => onNavigate("/login")}>{t("auth.back")}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { Alert };
