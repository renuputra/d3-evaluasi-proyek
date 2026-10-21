import express from "express";
import * as OpenApiValidator from "express-openapi-validator";
import { fileURLToPath } from "node:url";
import { ApiError } from "./errors.js";
import { createStore, checklistProgress, checklistTargetDate } from "./store.js";
import { addDays, nowWib } from "./clock.js";

const SPEC = fileURLToPath(new URL("../openapi.yaml", import.meta.url));
const STATUS_ORDER = [null, "siap_ditutup", "disetujui", "diserahterimakan", "ditutup"];

export function createApp({ sources, store = createStore(), clock = nowWib }) {
  const app = express();
  app.use(express.json());

  // Request dan respons divalidasi terhadap openapi.yaml: bila tidak cocok kontrak, respons ditolak (500).
  app.use(OpenApiValidator.middleware({ apiSpec: SPEC, validateRequests: true, validateResponses: true, validateSecurity: false }));

  const router = express.Router();

  // Autentikasi dan otorisasi: token valid (F-1), proyek ada (D-1), pemanggil adalah PM proyek tersebut.
  async function guard(req, res, next) {
    try {
      const authorization = req.get("Authorization") || "";
      if (!/^Bearer\s+\S+$/.test(authorization)) throw new ApiError(401, "UNAUTHORIZED", "Token tidak ada atau tidak sah");
      const identity = await sources.f1.validate(authorization);
      if (!identity) throw new ApiError(401, "UNAUTHORIZED", "Token tidak ada atau tidak sah");
      const { projectId } = req.params;
      const project = await sources.d1.getProject(projectId);
      if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", `Proyek dengan projectId ${projectId} tidak ditemukan`);
      // Pemetaan employeeId (F-2) ke userId (F-1) belum diputuskan; sementara F-1 mock menyertakan employeeId.
      if (!identity.roles.includes("PM") || identity.employeeId !== project.pmEmployeeId) {
        throw new ApiError(403, "FORBIDDEN", "Pengguna bukan PM proyek ini");
      }
      req.authorization = authorization;
      req.identity = identity;
      next();
    } catch (e) {
      next(e);
    }
  }
  const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

  const getClosureOr404 = (projectId) => {
    const closure = store.getClosure(projectId);
    if (!closure) throw new ApiError(404, "CLOSURE_NOT_FOUND", `Closure untuk proyek ${projectId} belum dibuat`);
    return closure;
  };
  const closureView = (c, includeChecklist) => ({
    closureId: c.closureId,
    projectId: c.projectId,
    status: c.status,
    contractEndDate: c.contractEndDate,
    checklistTargetDate: checklistTargetDate(c),
    checklist: includeChecklist ? c.checklist.map(({ itemCode, category, label, done, doneAt }) => ({ itemCode, category, label, done, doneAt })) : [],
    checklistProgress: checklistProgress(c),
    uatStatus: c.uatStatus,
    handoverDate: c.handoverDate,
    closedAt: c.closedAt,
    lessonsLearned: c.lessonsLearned,
    updatedAt: c.updatedAt,
  });

  // API-K03-01 getMonthlyReport
  router.get("/projects/:projectId/monthly-reports/:period", guard, handle(async (req, res) => {
    const { projectId, period } = req.params;
    const meta = store.getReport(projectId, period);
    if (!meta) throw new ApiError(404, "REPORT_NOT_FOUND", `Laporan periode ${period} untuk proyek ${projectId} tidak ditemukan`);
    const control = await sources.e5.getControlData(projectId, meta.periodStart, meta.periodEnd, req.authorization);
    const pick = (type) => control.riskIssues.filter((i) => i.type === type).map(({ id, title, level, status }) => ({ id, title, level, status }));
    res.json({
      reportId: meta.reportId,
      projectId,
      period,
      periodStart: meta.periodStart,
      periodEnd: meta.periodEnd,
      readyTarget: addDays(meta.periodEnd, -5), // H-5
      status: meta.status,
      // Belum terintegrasi: progres/tugas (E-4), milestone/resource (E-3). Dikembalikan null atau kosong.
      progressPercent: null,
      achievements: meta.achievements,
      tasksCompleted: [],
      tasksOngoing: [],
      milestones: [],
      risks: pick("RISK"),
      issues: pick("ISSUE"),
      resources: [],
      nextPlan: meta.nextPlan,
      supportingEvidence: [],
      approvedAt: meta.approvedAt,
      approvedBy: meta.approvedBy,
    });
  }));

  // API-K03-02 getClosure
  router.get("/projects/:projectId/closure", guard, handle(async (req, res) => {
    const closure = getClosureOr404(req.params.projectId);
    res.json(closureView(closure, req.query.includeChecklist !== false));
  }));

  // API-K03-03 updateChecklistItem
  router.patch("/projects/:projectId/closure/checklist/:itemCode", guard, handle(async (req, res) => {
    const closure = getClosureOr404(req.params.projectId);
    const item = closure.checklist.find((i) => i.itemCode === req.params.itemCode);
    if (!item) throw new ApiError(404, "CHECKLIST_ITEM_NOT_FOUND", `Item checklist ${req.params.itemCode} tidak dikenal`);
    if (closure.status === "ditutup") throw new ApiError(409, "CLOSURE_ALREADY_CLOSED", "Closure sudah berstatus ditutup; checklist tidak dapat diubah");
    const { done, uatResult } = req.body;
    if (item.category === "uat_approval" && !uatResult) {
      throw new ApiError(400, "VALIDATION_ERROR", "Isi request tidak valid", [{ field: "uatResult", reason: "Wajib diisi untuk item UAT" }]);
    }
    const now = clock();
    item.done = done;
    item.doneAt = done ? now : null;
    if (item.category === "uat_approval") closure.uatStatus = uatResult; // UAT disetujui klien secara offline, dicatat manual oleh PM
    closure.updatedAt = now;
    res.json({
      itemCode: item.itemCode,
      category: item.category,
      done: item.done,
      doneAt: item.doneAt,
      uatResult: item.category === "uat_approval" ? uatResult : null,
      checklistProgress: checklistProgress(closure),
      updatedBy: req.identity.userId,
      updatedAt: now,
    });
  }));

  // API-K03-04 updateClosureStatus
  router.patch("/projects/:projectId/closure/status", guard, handle(async (req, res) => {
    const closure = getClosureOr404(req.params.projectId);
    const { targetStatus, handoverDate } = req.body;
    const view = (c) => ({
      closureId: c.closureId,
      projectId: c.projectId,
      previousStatus: c.lastChange?.previousStatus ?? null,
      status: c.status,
      changedBy: c.lastChange.changedBy,
      changedAt: c.lastChange.changedAt,
      closedAt: c.closedAt,
    });
    if (closure.status === targetStatus) return res.json(view(closure)); // diulang: idempoten, data tidak berubah

    if (STATUS_ORDER.indexOf(targetStatus) !== STATUS_ORDER.indexOf(closure.status) + 1) {
      throw new ApiError(409, "INVALID_STATUS_TRANSITION", `Status ${closure.status ?? "belum ada"} tidak dapat langsung menjadi ${targetStatus}`);
    }
    if (targetStatus === "siap_ditutup") {
      const undone = closure.checklist.filter((i) => !i.done).map((i) => i.itemCode);
      if (undone.length > 0) {
        throw new ApiError(409, "CHECKLIST_INCOMPLETE", `Checklist closing belum lengkap: ${undone.length} item belum selesai`, [
          { field: "checklist", reason: `Item belum selesai: ${undone.join(", ")}` },
        ]);
      }
      if (closure.uatStatus !== "disetujui") throw new ApiError(409, "UAT_NOT_APPROVED", "UAT belum disetujui klien");
    }
    if (targetStatus === "diserahterimakan" && !handoverDate) {
      throw new ApiError(400, "VALIDATION_ERROR", "Isi request tidak valid", [
        { field: "handoverDate", reason: "Wajib diisi bila targetStatus = diserahterimakan" },
      ]);
    }

    const now = clock();
    closure.lastChange = { previousStatus: closure.status, changedBy: req.identity.userId, changedAt: now };
    closure.status = targetStatus;
    if (targetStatus === "diserahterimakan") closure.handoverDate = handoverDate;
    if (targetStatus === "ditutup") closure.closedAt = now;
    closure.updatedAt = now;
    res.json(view(closure));
  }));

  app.use("/api/v1", router);

  // Penanganan kesalahan: semua dibalas dalam bentuk { code, message, details? }.
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ code: err.code, message: err.message, ...(err.details && { details: err.details }) });
    }
    const status = err.status ?? 500;
    if (status === 400) {
      const details = (err.errors ?? []).map((e) => ({
        field: String(e.path ?? "").split("/").filter(Boolean).pop() ?? "request",
        reason: e.message ?? "tidak valid",
      }));
      const isPeriod = details.some((d) => d.field === "period");
      return res.status(400).json({
        code: isPeriod ? "INVALID_PERIOD" : "VALIDATION_ERROR",
        message: isPeriod ? "Format period harus YYYY-MM" : "Isi request tidak valid",
        details,
      });
    }
    if (status === 404) return res.status(404).json({ code: "NOT_FOUND", message: "Endpoint tidak ditemukan" });
    console.error(err);
    res.status(500).type("text/plain").send("Kesalahan server");
  });

  return app;
}
