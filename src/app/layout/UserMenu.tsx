import { Lock, LogOut, ShieldOff, UserRound } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useCurrentUser, userDisplayName, userInitials } from "../../features/profile/useCurrentUser";
import { useT } from "../../lib/i18n/LocalizationProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../shared/ui/dropdown-menu";

export function UserMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { logout, logoutAll } = useAuth();
  const { t } = useT();
  const me = useCurrentUser();
  const profile = me.data?.data;
  const name = userDisplayName(profile) || (me.isLoading ? "Loading..." : "Guest");
  const roles = profile?.roles ?? [];

  function handleLogout() {
    void logout();
    onNavigate("/login");
  }

  function handleLogoutAll() {
    void logoutAll();
    onNavigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="user-menu-trigger" aria-label="Open user menu">
        <span className="avatar avatar-sm">{userInitials(profile)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[280px]">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <span className="avatar avatar-lg">{userInitials(profile)}</span>
          <div className="grid gap-0.5 overflow-hidden">
            <strong className="truncate text-sm font-semibold">{name}</strong>
            {profile?.email ? <small className="truncate text-xs text-[hsl(var(--muted-foreground))]">{profile.email}</small> : null}
            {roles.length > 0 ? <small className="truncate text-xs capitalize text-[hsl(var(--muted-foreground))]">{roles.join(", ")}</small> : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onNavigate("/")}>
          <UserRound size={18} /> {t("nav.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onNavigate("/security")}>
          <Lock size={18} /> {t("nav.security")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut size={18} /> {t("nav.logout")}
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={handleLogoutAll}>
          <ShieldOff size={18} /> {t("nav.logoutEverywhere")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
