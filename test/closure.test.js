import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startAll, call, A, B } from "../testlib/helpers.js";

let ctx;
before(async () => { ctx = await startAll(); });
after(() => ctx.close());
const api = (m, p, o) => call(ctx.base, m, p, o);
const patchStatus = (id, body, o) => api("PATCH", `/projects/${id}/closure/status`, { body, ...o });
const check = (id, code, body = { done: true }) => api("PATCH", `/projects/${id}/closure/checklist/${code}`, { body });

test("alur penutupan lengkap sampai ditutup", async () => {
  for (const c of ["FD-01", "DOC-01", "HND-01", "CLS-01"]) assert.equal((await check(A, c)).status, 200);
  const uat = await check(A, "UAT-01", { done: true, uatResult: "disetujui" });
  assert.equal(uat.json.checklistProgress, 100);
  let prev = null;
  for (const [target, extra] of [["siap_ditutup"], ["disetujui"], ["diserahterimakan", { handoverDate: "2026-10-28" }], ["ditutup"]]) {
    const r = await patchStatus(A, { targetStatus: target, ...extra });
    assert.equal(r.status, 200);
    assert.equal(r.json.previousStatus, prev);
    assert.equal(r.json.status, target);
    assert.equal(r.json.changedBy, "USR-0042");
    prev = target;
  }
  const closure = await api("GET", `/projects/${A}/closure`);
  assert.equal(closure.json.status, "ditutup");
  assert.equal(closure.json.closedAt, "2026-10-21T10:00:00+07:00");
  assert.equal((await check(A, "FD-01", { done: false })).json.code, "CLOSURE_ALREADY_CLOSED");
});

test("checklist belum lengkap ditolak 409 dan data tidak berubah", async () => {
  const r = await patchStatus(B, { targetStatus: "siap_ditutup" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "CHECKLIST_INCOMPLETE");
  assert.match(r.json.details[0].reason, /UAT-01, HND-01/);
  const after = await api("GET", `/projects/${B}/closure`);
  assert.equal(after.json.status, null);
  assert.equal(after.json.checklistProgress, 60);
});

test("UAT yang belum disetujui menolak siap_ditutup (UAT_NOT_APPROVED)", async () => {
  await check(B, "HND-01");
  const uat = await check(B, "UAT-01", { done: true, uatResult: "revisi" });
  assert.equal(uat.status, 200);
  const r = await patchStatus(B, { targetStatus: "siap_ditutup" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "UAT_NOT_APPROVED");
});

test("transisi melompat ditolak, ulangan idempoten, handoverDate wajib", async () => {
  assert.equal((await patchStatus(B, { targetStatus: "disetujui" })).json.code, "INVALID_STATUS_TRANSITION");
  await check(B, "UAT-01", { done: true, uatResult: "disetujui" });
  const first = await patchStatus(B, { targetStatus: "siap_ditutup" });
  const again = await patchStatus(B, { targetStatus: "siap_ditutup" });
  assert.equal(again.status, 200);
  assert.deepEqual(again.json, first.json);
  await patchStatus(B, { targetStatus: "disetujui" });
  const noDate = await patchStatus(B, { targetStatus: "diserahterimakan" });
  assert.equal(noDate.status, 400);
  assert.equal(noDate.json.code, "VALIDATION_ERROR");
  assert.equal(noDate.json.details[0].field, "handoverDate");
  assert.equal((await patchStatus(B, { targetStatus: "diserahterimakan", handoverDate: "2026-10-28" })).status, 200);
});

test("masukan tidak valid: status di luar enum, item UAT tanpa uatResult, itemCode tidak dikenal", async () => {
  assert.equal((await patchStatus(A, { targetStatus: "selesai" })).status, 400);
  assert.equal((await check(B, "UAT-01", { done: true })).json.code, "VALIDATION_ERROR");
  assert.equal((await check(B, "XYZ-99")).json.code, "CHECKLIST_ITEM_NOT_FOUND");
});

test("akses: 401, 403, 404", async () => {
  assert.equal((await api("GET", `/projects/${A}/closure`, { token: null })).status, 401);
  assert.equal((await api("GET", `/projects/${A}/closure`, { token: "token-tidak-dikenal" })).status, 401);
  assert.equal((await api("GET", `/projects/${A}/closure`, { token: "token-contoh-pm-lain" })).json.code, "FORBIDDEN");
  assert.equal((await api("GET", `/projects/${A}/closure`, { token: "token-contoh-tenaga-ahli" })).status, 403);
  assert.equal((await api("GET", "/projects/01924b1e-7f32-7a81-9b12-45e8a9999999/closure")).json.code, "PROJECT_NOT_FOUND");
});

test("includeChecklist=false mengembalikan checklist kosong", async () => {
  const r = await api("GET", `/projects/${B}/closure?includeChecklist=false`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.checklist, []);
});

test("laporan bulanan: data dari mock E-5, period salah, periode tidak ada", async () => {
  const r = await api("GET", `/projects/${A}/monthly-reports/2026-10`);
  assert.equal(r.status, 200);
  assert.equal(r.json.readyTarget, "2026-10-26");
  assert.equal(r.json.risks[0].status, "OPEN");
  assert.equal(r.json.issues[0].status, "IN_PROGRESS");
  assert.equal((await api("GET", `/projects/${A}/monthly-reports/2026-13`)).json.code, "INVALID_PERIOD");
  assert.equal((await api("GET", `/projects/${A}/monthly-reports/2026-08`)).json.code, "REPORT_NOT_FOUND");
});
