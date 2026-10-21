import { ApiError } from "./errors.js";

// Klien untuk layanan kelompok lain. Alamatnya diatur lewat F1_BASE_URL, D1_BASE_URL, E5_BASE_URL.
// Saat layanan tidak dapat dihubungi, D-3 membalas 503 DEPENDENCY_UNAVAILABLE (gaya E-3).
export function createSources({ f1BaseUrl, d1BaseUrl, e5BaseUrl, timeoutMs = 2000 }) {
  async function get(service, url, headers = {}) {
    try {
      return await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new ApiError(503, "DEPENDENCY_UNAVAILABLE", `Layanan ${service} tidak dapat dihubungi; coba lagi nanti`);
    }
  }
  const unavailable = (service) =>
    new ApiError(503, "DEPENDENCY_UNAVAILABLE", `Layanan ${service} membalas dengan kesalahan; coba lagi nanti`);

  return {
    f1: {
      // ASUMSI: kontrak validasi token F-1 (API-F1-05) belum terbit. Mock membalas identitas pengguna.
      async validate(authorization) {
        const r = await get("F-1", `${f1BaseUrl}/api/v1/auth/validate`, { Authorization: authorization });
        if (r.status === 200) return r.json();
        if (r.status === 401) return null;
        throw unavailable("F-1");
      },
    },
    d1: {
      // Mengikuti API-K01-07 menurut dokumen E-3: projectId, projectName, clientName, status, pmEmployeeId.
      async getProject(projectId) {
        const r = await get("D-1", `${d1BaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}`);
        if (r.status === 200) return r.json();
        if (r.status === 404) return null;
        throw unavailable("D-1");
      },
    },
    e5: {
      // Mengikuti API-K05-09 (OpenAPI E-5 v0.1, 13 Okt 2026). Isi item riskIssues[] masih ASUMSI.
      async getControlData(projectId, periodStart, periodEnd, authorization) {
        const q = new URLSearchParams({ periodStart, periodEnd });
        const r = await get("E-5", `${e5BaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/control-data?${q}`, { Authorization: authorization });
        if (r.status === 200) return r.json();
        throw unavailable("E-5");
      },
    },
  };
}
