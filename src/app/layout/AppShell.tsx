import { Building2, Moon, PanelLeft, Sun, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { allNavItems, findNavItem, navItems } from "./navItems";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";
import { useTheme } from "../providers/ThemeProvider";
import { useT } from "../../lib/i18n/LocalizationProvider";

const COLLAPSED_KEY = "expenseflow:sidebar-collapsed";
const MOBILE_QUERY = "(max-width: 880px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useT();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      className="icon-button"
      onClick={toggle}
      aria-label={t("nav.theme.toggle")}
      title={theme === "dark" ? t("nav.theme.light") : t("nav.theme.dark")}
    >
      <Icon size={18} />
    </button>
  );
}

export function AppShell({ activePath, children, onNavigate }: { activePath: string; children: ReactNode; onNavigate: (path: string) => void }) {
  const isMobile = useIsMobile();
  const [collapsedPref, setCollapsedPref] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useT();
  const collapsed = collapsedPref || isMobile;
  const activeItem = findNavItem(activePath);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsedPref));
  }, [collapsedPref]);

  useEffect(() => {
    // Close the mobile drawer on every navigation.
    setDrawerOpen(false);
  }, [activePath]);

  function handleNavigate(href: string) {
    onNavigate(href);
  }

  return (
    <div className="shell">
      {isMobile && drawerOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside className={[collapsed ? "collapsed" : "", isMobile && drawerOpen ? "drawer-open" : ""].filter(Boolean).join(" ")}>
        <div className="sidebar-header">
          {collapsed ? null : (
            <a className="brand" href="/" onClick={(event) => { event.preventDefault(); handleNavigate("/"); }}>
              <span className="brand-mark"><Wallet size={16} /></span>
              <span>ExpenseFlow</span>
            </a>
          )}
          <button
            className="icon-button sidebar-collapse-toggle"
            onClick={() => {
              if (isMobile) setDrawerOpen(false);
              else setCollapsedPref((value) => !value);
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={16} />
          </button>
        </div>
        <nav>
          {navItems.groups.map((group) => (
            <div key={group.label} className="sidebar-group">
              {collapsed ? null : <div className="sidebar-group-title">{group.label}</div>}
              {group.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  data-tooltip={t(item.labelKey)}
                  className={activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href + "/")) ? "active" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate(item.href);
                  }}
                >
                  <item.icon size={18} />
                  {collapsed ? null : <span>{t(item.labelKey)}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="org-line">
            <span className="org-icon"><Building2 size={14} /></span>
            <span className="org-text">ExpenseFlow</span>
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          {isMobile ? (
            <button
              className="icon-button topbar-menu"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <PanelLeft size={18} />
            </button>
          ) : null}
          {activeItem ? (
            <div className="topbar-context">
              <activeItem.icon size={16} />
              <span>{t(activeItem.labelKey)}</span>
            </div>
          ) : (
            <div className="topbar-context">
              <Wallet size={16} />
              <span>ExpenseFlow</span>
            </div>
          )}
          <div className="topbar-spacer" />
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationsMenu onNavigate={handleNavigate} />
          <UserMenu onNavigate={handleNavigate} />
        </header>
        <main>{children}</main>
      </div>
      {/* Suppress the "allNavItems referenced" warning when nothing uses it elsewhere */}
      <span hidden>{allNavItems.length}</span>
    </div>
  );
}
