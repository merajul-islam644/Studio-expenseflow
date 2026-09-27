import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useCurrentUser, userDisplayName, userInitials } from "./useCurrentUser";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { ChipList } from "../../shared/ui/Chip";

export function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const me = useCurrentUser();
  const { t } = useT();
  const profile = me.data?.data;
  const name = userDisplayName(profile);

  return (
    <section>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      {me.isLoading ? (
        <div className="profile-card">
          <Skeleton className="skeleton-avatar-lg" />
          <div className="profile-heading">
            <Skeleton className="skeleton-line-lg" />
            <Skeleton className="skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="profile-card">
          <span className="avatar avatar-lg">{userInitials(profile)}</span>
          <div className="profile-heading">
            <h3>{name || (me.isError ? "Session unavailable" : "Unknown user")}</h3>
            {profile?.email ? <span className="profile-meta"><Mail size={14} /> {profile.email}</span> : null}
            <StatusPill tone={me.isSuccess ? "good" : "warn"}>
              {me.isSuccess ? "Signed in" : "Session unavailable"}
            </StatusPill>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <ShieldCheck size={14} />
          <span>{t("profile.security")}</span>
        </div>
        <div className="chips">
          <button type="button" className="link-button" onClick={() => onNavigate("/security")}>
            {t("nav.security")} →
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <ShieldCheck size={14} />
          <span>{t("profile.roles")}</span>
        </div>
        {me.isLoading ? (
          <Skeleton className="skeleton-line" />
        ) : (
          <ChipList empty="No roles assigned" items={profile?.roles} />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <ShieldCheck size={14} />
          <span>{t("profile.permissions")} ({profile?.permissions?.length ?? 0})</span>
        </div>
        {me.isLoading ? (
          <Skeleton className="skeleton-line" />
        ) : (
          <ChipList empty="No permissions returned" items={profile?.permissions} />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <UserRound size={14} />
          <span>{t("profile.session")}</span>
        </div>
        <div className="chips">
          <span className="chip">{profile?.itemId ? `ID ${profile.itemId}` : "Unknown"}</span>
          <span className="chip">{profile?.email || "No email"}</span>
        </div>
      </div>
    </section>
  );
}
