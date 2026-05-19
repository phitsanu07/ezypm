import type { ApiErrorCode } from "@/types";

export const errorMessages: Partial<Record<ApiErrorCode, string>> = {
  UNAUTHENTICATED: "กรุณาเข้าสู่ระบบอีกครั้ง / Please sign in again",
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านไม่ถูกต้อง / Invalid email or password",
  USER_SUSPENDED: "บัญชีของคุณถูกระงับ / Your account has been suspended",
  FORBIDDEN: "คุณไม่มีสิทธิ์ดำเนินการนี้ / You don't have permission",
  NOT_BOARD_MEMBER: "คุณไม่ใช่สมาชิกของบอร์ดนี้ / You are not a board member",
  BOARD_NOT_FOUND: "ไม่พบบอร์ด / Board not found",
  PROJECT_NOT_FOUND: "ไม่พบโปรเจกต์ / Project not found",
  SUBPROJECT_NOT_FOUND: "ไม่พบซับโปรเจกต์ / Sub-project not found",
  ACTIVITY_NOT_FOUND: "ไม่พบกิจกรรม / Activity not found",
  USER_NOT_FOUND: "ไม่พบผู้ใช้ / User not found",
  ALREADY_MEMBER: "ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว / User is already a member",
  NOT_A_MEMBER: "ผู้ใช้นี้ไม่ได้เป็นสมาชิก / User is not a member",
  CANNOT_REMOVE_OWNER: "ไม่สามารถลบเจ้าของบอร์ด / Cannot remove board owner",
  CANNOT_SUSPEND_SELF: "ไม่สามารถระงับบัญชีของตัวเอง / Cannot suspend your own account",
  EMAIL_TAKEN: "อีเมลนี้ถูกใช้แล้ว / Email is already taken",
  Z_VALIDATION: "ข้อมูลไม่ถูกต้อง / Invalid data",
  INTERNAL_ERROR: "เกิดข้อผิดพลาดภายใน / Internal server error",
  NETWORK_ERROR: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต / Check your connection",
  RATE_LIMITED: "คำขอมากเกินไป กรุณาลองใหม่ / Too many requests, please try again",
};

export function getErrorMessage(code: ApiErrorCode, fallback?: string): string {
  return errorMessages[code] ?? fallback ?? "เกิดข้อผิดพลาด / Something went wrong";
}
