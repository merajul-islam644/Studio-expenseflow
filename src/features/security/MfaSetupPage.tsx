import { CheckCircle2, ChevronLeft, Copy, KeyRound, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ActionButton } from "../../shared/ui/ActionButton";

type SetupPayload = {
  secret: string;
  qrCodeUri: string;
  qrCodeDataUri?: string;
  manualEntryKey?: string;
};

type SetupStep = "scan" | "confirm" | "backup";

function readSetupPayload(value: unknown): SetupPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  const secret = typeof data.secret === "string" ? data.secret : typeof data.manualEntryKey === "string" ? data.manualEntryKey : "";
  const qrCodeUri = typeof data.qrCodeUri === "string" ? data.qrCodeUri : typeof data.uri === "string" ? data.uri : "";
  const qrCodeDataUri = typeof data.qrCodeDataUri === "string" ? data.qrCodeDataUri : undefined;
  const manualEntryKey = typeof data.manualEntryKey === "string" ? data.manualEntryKey : undefined;
  if (!secret && !qrCodeUri) return undefined;
  return { secret, qrCodeUri, qrCodeDataUri, manualEntryKey };
}

export function MfaSetupPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [payload, setPayload] = useState<SetupPayload | undefined>();
  const [step, setStep] = useState<SetupStep>("scan");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const response = await blocksClient.mfa.totp.setup();
        const parsed = readSetupPayload(response);
        if (!cancelled && parsed) setPayload(parsed);
      } catch (caught) {
        if (!cancelled) setError((caught as Error).message || "Could not start MFA setup.");
      }
    }
    void start();
    return () => { cancelled = true; };
  }, []);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!code || code.length < 6) return;
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.mfa.totp.verifySetup({ code });
      setStep("backup");
    } catch (caught) {
      setError((caught as Error).message || "Verification failed. Check the code and try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleGenerateBackupCodes() {
    setError(undefined);
    setPending(true);
    try {
      const response = await blocksClient.mfa.backupCodes.generate() as { codes?: string[] } | string[];
      const list = Array.isArray(response) ? response : Array.isArray(response.codes) ? response.codes : [];
      setBackupCodes(list);
    } catch (caught) {
      // Backup codes are optional; the tenant policy may not allow them, in
      // which case MFA is still enrolled and the user is set up -- so this
      // is a soft error: show what we have, log the reason.
      setError((caught as Error).message || "Backup codes are not available for this tenant.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopyBackupCodes() {
    if (!backupCodes.length) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — the codes are already on screen
    }
  }

  const stepItems: Array<{ id: SetupStep; label: string }> = [
    { id: "scan", label: t("security.mfa.step1") },
    { id: "confirm", label: t("security.mfa.step2") },
    { id: "backup", label: t("security.mfa.step3") }
  ];

  return (
    <section>
      <PageHeader
        title={t("security.mfa.title")}
        subtitle={t("security.mfa.setupHelp")}
        actions={
          <ActionButton variant="icon" onClick={() => onNavigate("/security")} title={t("common.back")} icon={<ChevronLeft size={18} />} />
        }
      />

      <div className="stepper">
        {stepItems.map((item, index) => {
          const currentIndex = stepItems.findIndex((stepItem) => stepItem.id === step);
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={item.id} className={`stepper-item ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}>
              <span className="stepper-index">{isDone ? "✓" : index + 1}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {step === "scan" ? (
        <section className="panel">
          <div className="panel-title">
            <QrCode size={14} />
            <span>{t("security.mfa.step1")}</span>
          </div>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.mfa.scanHelp")}</p>
          {payload?.qrCodeDataUri ? (
            <div className="qr-frame">
              <img src={payload.qrCodeDataUri} alt="MFA QR code" />
            </div>
          ) : payload?.qrCodeUri ? (
            <div className="qr-frame">
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
                {payload.qrCodeUri}
              </p>
            </div>
          ) : (
            <SkeletonForQr />
          )}
          {payload?.secret ? (
            <div>
              <small style={{ display: "block", marginBottom: 6, color: "hsl(var(--muted-foreground))" }}>
                {t("security.mfa.secretLabel")}
              </small>
              <div className="secret-line">{payload.secret}</div>
            </div>
          ) : null}
          <div className="form-actions">
            <button className="primary-button" onClick={() => setStep("confirm")} disabled={!payload}>
              {t("common.continue")}
            </button>
          </div>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section className="panel">
          <div className="panel-title">
            <KeyRound size={14} />
            <span>{t("security.mfa.step2")}</span>
          </div>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.mfa.confirmHelp")}</p>
          <form className="form-grid" style={{ gridTemplateColumns: "1fr" }} onSubmit={handleVerify}>
            <FormField
              label={t("common.codeLabel")}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
              disabled={pending}
            />
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setStep("scan")} disabled={pending}>
                {t("common.back")}
              </button>
              <button type="submit" className="primary-button" disabled={pending || code.length !== 6}>
                {pending ? t("common.loading") : t("common.continue")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === "backup" ? (
        <section className="panel">
          <div className="panel-title">
            <CheckCircle2 size={14} />
            <span>{t("security.mfa.backupCodesTitle")}</span>
          </div>
          <Alert tone="success">{t("security.mfa.verified")}</Alert>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{t("security.mfa.backupCodesHelp")}</p>
          <Alert tone="warn">{t("security.mfa.backupCodesWarning")}</Alert>
          {backupCodes.length > 0 ? (
            <>
              <div className="backup-codes">
                {backupCodes.map((code) => (
                  <div key={code} className="backup-code">{code}</div>
                ))}
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={handleCopyBackupCodes}>
                  <Copy size={16} /> {copied ? t("common.copied") : t("common.copy")}
                </button>
              </div>
            </>
          ) : (
            <div className="form-actions">
              <button className="secondary-button" onClick={handleGenerateBackupCodes} disabled={pending}>
                {pending ? t("common.loading") : t("security.mfa.backupCodesTitle")}
              </button>
            </div>
          )}
          <div className="form-actions">
            <button className="primary-button" onClick={() => onNavigate("/security")}>
              {t("common.continue")}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SkeletonForQr() {
  return (
    <div className="qr-frame">
      <div className="skeleton" style={{ width: 220, height: 220 }} />
    </div>
  );
}
