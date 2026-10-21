// Bentuk kesalahan bersama: { code, message, details? } (materi pertemuan 3).
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
