import { useAuthStore } from "@/frontend/store/useAuthStore";

export function NoBoardAccessPage() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="no-access-page">
      <div className="no-access-card">
        <div className="no-access-icon">🔒</div>
        <h1 className="no-access-title">ขออภัย — คุณยังไม่มีบอร์ดที่เข้าถึงได้</h1>
        <p className="no-access-body">
          บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าถึงบอร์ดใดๆ กรุณาติดต่อผู้ดูแลระบบ
          <br />
          <br />
          Your account does not have access to any boards. Please contact your
          administrator.
        </p>
        <div className="no-access-actions">
          <a
            href="mailto:admin@gridwork.dev"
            className="btn btn-primary"
          >
            ติดต่อ Admin / Contact Admin
          </a>
          <button
            className="btn btn-secondary"
            onClick={() => logout().catch(() => undefined)}
          >
            ออกจากระบบ / Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
