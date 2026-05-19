import { useAuthStore } from "@/frontend/store/useAuthStore";
import { BoardSwitcher } from "@/frontend/components/layout/BoardSwitcher";
import { UserMenu } from "@/frontend/components/layout/UserMenu";

interface AppBarProps {
  showAdminBadge?: boolean;
}

export function AppBar({ showAdminBadge }: AppBarProps) {
  const profile = useAuthStore((s) => s.profile);

  return (
    <header className="appbar" role="banner">
      <button
        type="button"
        className="appbar-brand"
        onClick={() => {
          window.location.hash = "/";
        }}
        aria-label="Go to home"
      >
        <div className="appbar-brand-icon">G</div>
        <span>GridWork</span>
      </button>

      {profile?.role === "admin" && showAdminBadge && (
        <span className="appbar-badge">Admin</span>
      )}

      <div className="appbar-divider" />

      <BoardSwitcher />

      <div className="appbar-spacer" />

      <UserMenu />
    </header>
  );
}
