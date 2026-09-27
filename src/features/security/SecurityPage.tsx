import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, ShieldOff, Smartphone } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { FormField } from "../../shared/ui/FormField";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";

type MfaStatus = { isEnrolled: boolean };

async function fetchMfaStatus(): Promise<MfaStatus> {
  // Reading the tenant policy tells us whether MFA is allowed; reading
  // backup-codes count tells us whether this user has enrolled (the SDK
  // returns a count, never codes). Wrap them in one object so the query
  // is a single render pass.
  try {
    const codes = await blocksClient.mfa.backupCodes.list() as { remaining?: number };
    const isEnrolled = typeof codes?.remaining === "number" ? codes.remaining >= 0 : false;
    return { isEnrolled };
  } catch {
    return { isEnrolled: false };
  }
}

function PasswordSection() {
  const { t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mismatch || tooShort || !current || !next) return;
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.auth.changePassword({ oldPassword: current, newPassword: next });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (caught) {
      setError((caught as Error).message || "Password change failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <KeyRound size={14} />
        <span>{t("security.password.title")}</span>
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.password.subtitle")}</p>
      {done ? <Alert tone="success">{t("security.password.success")}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="form-grid" onSubmit={handleSubmit}>
        <FormField
          label={t("security.password.current")}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
          disabled={pending}
        />
        <div />
        <FormField
          label={t("security.password.new")}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
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
        {tooShort ? <small className="form-field-error">Password must be at least 8 characters.</small> : null}
        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={pending || !current || !next || !confirm || mismatch || tooShort}>
            {pending ? t("common.loading") : t("security.password.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}

function MfaSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const status = useQuery({
    queryKey: ["security", "mfa-status"],
    queryFn: fetchMfaStatus,
    staleTime: 30_000
  });
  const isEnrolled = status.data?.isEnrolled ?? false;

  return (
    <section className="panel">
      <div className="panel-title">
        <Smartphone size={14} />
        <span>{t("security.mfa.title")}</span>
        <div style={{ marginLeft: "auto" }}>
          <StatusPill tone={isEnrolled ? "good" : "neutral"}>
            {isEnrolled ? t("security.mfa.statusOn") : t("security.mfa.statusOff")}
          </StatusPill>
        </div>
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.mfa.subtitle")}</p>
      <div className="form-actions">
        <button className="secondary-button" onClick={() => onNavigate("/security/mfa-setup")}>
          {isEnrolled ? <CheckCircle2 size={16} /> : <Smartphone size={16} />} {t("security.mfa.setup")}
        </button>
      </div>
    </section>
  );
}

function SessionsSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const { logout, logoutAll } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function handleSignOut() {
    void logout();
    onNavigate("/login");
  }

  async function handleSignOutAll() {
    setPending(true);
    setError(undefined);
    try {
      await logoutAll();
      onNavigate("/login");
    } catch (caught) {
      setError((caught as Error).message || "Sign-out failed.");
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <ShieldOff size={14} />
        <span>{t("security.sessions.title")}</span>
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.sessions.subtitle")}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="form-actions" style={{ flexWrap: "wrap", gap: 12 }}>
        <button className="secondary-button" onClick={handleSignOut}>
          {t("security.sessions.signOut")}
        </button>
        <button className="danger-button" onClick={() => setConfirmOpen(true)} disabled={pending}>
          {t("security.sessions.signOutAll")}
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={t("security.sessions.confirmTitle")}
        message={t("security.sessions.confirmMessage")}
        confirmLabel={t("security.sessions.confirmYes")}
        destructive
        busy={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSignOutAll}
      />
    </section>
  );
}

export function SecurityPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  return (
    <section>
      <PageHeader title={t("security.title")} subtitle={t("security.subtitle")} />
      <PasswordSection />
      <MfaSection onNavigate={onNavigate} />
      <SessionsSection onNavigate={onNavigate} />
    </section>
  );
}
