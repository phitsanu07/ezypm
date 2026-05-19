import type { ApiErrorCode } from "@/types";

export class ApiClientError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: ApiErrorCode;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}
