import { useState } from "react";
import { useAuthStore } from "@/frontend/store/useAuthStore";

const DEMO_CREDS = [
  { role: "Admin", email: "admin@gridwork.dev", password: "demo1234" },
  { role: "Editor", email: "editor@gridwork.dev", password: "demo1234" },
  { role: "Viewer", email: "viewer@gridwork.dev", password: "demo1234" },
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const errorMessage = useAuthStore((s) => s.errorMessage);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoading = status === "signing-in" || status === "bootstrapping";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    await login(email.trim(), password);
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-logo">GridWork</div>
        <p className="login-brand-tagline">
          Project Management ที่ใช้เหมือน Excel — ทุกโปรเจกต์ในที่เดียว
        </p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <h1 className="login-title">เข้าสู่ระบบ</h1>
          <p className="login-subtitle">Sign in to your GridWork account</p>

          {errorMessage && (
            <div className="login-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="email">
                อีเมล / Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="password">
                รหัสผ่าน / Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ / Sign in"}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="creds-quickfill">
              <div className="creds-quickfill-label">
                Dev — Quick fill (demo accounts)
              </div>
              {DEMO_CREDS.map((cred) => (
                <div
                  key={cred.role}
                  className="creds-quickfill-item"
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword(cred.password);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }
                  }}
                >
                  <span className="creds-quickfill-role">{cred.role}</span>
                  <span className="creds-quickfill-email">{cred.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
