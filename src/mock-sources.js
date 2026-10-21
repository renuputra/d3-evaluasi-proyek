import express from "express";
import { loadFixture } from "./fixtures.js";

// MOCK untuk F-1, D-1, dan E-5. Bukan layanan nyata: data dibaca dari folder fixtures/.
// Bentuk respons mengikuti dokumen kelompok masing-masing; bagian yang belum terbit ditandai ASUMSI.
export function createMockSources() {
  const app = express();
  const tokens = loadFixture("tokens.json");
  const projects = loadFixture("projects.json");
  const control = loadFixture("e5-control-data.json");

  // F-1 (ASUMSI, kontrak belum terbit): validasi token dan identitas pengguna.
  app.get("/api/v1/auth/validate", (req, res) => {
    const m = (req.get("Authorization") || "").match(/^Bearer\s+(\S+)$/);
    const identity = m && tokens[m[1]];
    if (!identity) return res.status(401).json({ code: "UNAUTHORIZED", message: "Token tidak ada atau tidak sah" });
    res.json(identity);
  });

  // D-1: API-K01-07, hanya proyek berstatus REGISTERED yang dibalas 200 (menurut dokumen E-3).
  app.get("/api/v1/projects/:projectId", (req, res) => {
    const p = projects.find((x) => x.projectId === req.params.projectId && x.status === "REGISTERED");
    if (!p) return res.status(404).json({ code: "PROJECT_NOT_FOUND", message: "Proyek tidak ditemukan" });
    res.json(p);
  });

  // E-5: API-K05-09, data mentah risiko, isu, dan change log per periode.
  app.get("/api/v1/projects/:projectId/control-data", (req, res) => {
    const { periodStart, periodEnd } = req.query;
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
    if (!isDate(periodStart) || !isDate(periodEnd) || periodEnd < periodStart) {
      return res.status(400).json({ code: "INVALID_PERIOD", message: "periodStart dan periodEnd harus YYYY-MM-DD dan periodEnd tidak boleh sebelum periodStart" });
    }
    if (!projects.some((x) => x.projectId === req.params.projectId)) {
      return res.status(404).json({ code: "PROJECT_NOT_FOUND", message: "Proyek tidak ditemukan" });
    }
    res.json({
      projectId: req.params.projectId,
      periodStart,
      periodEnd,
      generatedAt: "2026-10-21T04:00:00Z",
      riskIssues: control.riskIssues,
      changeLog: control.changeLog,
    });
  });

  return app;
}
