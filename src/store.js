import { loadFixture } from "./fixtures.js";
import { addDays } from "./clock.js";

// Penyimpanan di memori. Menjalankan ulang server mengembalikan data awal (seed) yang sama.
// Belum ada database: lihat temuan T-04 pada laporan demo.
export function createStore() {
  const closures = new Map();
  for (const c of loadFixture("closures.json")) {
    closures.set(c.projectId, {
      closureId: c.closureId,
      projectId: c.projectId,
      status: null,
      contractEndDate: c.contractEndDate, // sumber nyata: D-2 (belum tersedia), sementara dari seed
      checklist: c.checklist.map((i) => ({ ...i, doneAt: null })),
      uatStatus: "belum_diajukan",
      handoverDate: null,
      closedAt: null,
      lessonsLearned: null,
      lastChange: null,
      updatedAt: "2026-10-20T09:00:00+07:00",
    });
  }
  const reports = loadFixture("reports.json");

  return {
    getClosure: (projectId) => closures.get(projectId) ?? null,
    getReport: (projectId, period) => reports.find((r) => r.projectId === projectId && r.period === period) ?? null,
  };
}

export function checklistProgress(closure) {
  const total = closure.checklist.length;
  const done = closure.checklist.filter((i) => i.done).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export const checklistTargetDate = (closure) => addDays(closure.contractEndDate, -7); // H-7 (mitra Q-04)
