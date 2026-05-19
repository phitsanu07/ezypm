import { useState } from "react";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { Avatar } from "@/frontend/components/ui/Avatar";

export function UserMenu() {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  if (!profile) return null;

  return (
    <div className="user-menu">
      <button
        className="user-menu-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        <Avatar
          name={profile.name}
          initials={profile.initials}
          color={profile.color}
          size={32}
        />
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-name">{profile.name}</div>
              <div className="user-menu-email">{profile.email}</div>
            </div>
            <button
              className="user-menu-item"
              onClick={() => {
                window.location.hash = "/";
                setOpen(false);
              }}
            >
              ▦ Grid View
            </button>
            {profile.role === "admin" && (
              <button
                className="user-menu-item"
                onClick={() => {
                  window.location.hash = "/admin?tab=users";
                  setOpen(false);
                }}
              >
                ⚙ Admin Panel
              </button>
            )}
            <button
              className="user-menu-item danger"
              onClick={() => {
                logout().catch(() => undefined);
                setOpen(false);
              }}
            >
              ↪ ออกจากระบบ / Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
