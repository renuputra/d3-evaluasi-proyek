// Demo alur lokal pertama D-3: PM menyusun laporan dan menutup proyek (kasus berhasil),
// lalu beberapa kasus gagal/ditolak. Jalankan setelah `npm start`:  npm run demo
// Hasil ditulis ke demo-output/hasil-demo.md dan demo-output/hasil-demo.json (bukti untuk laporan).
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3003/api/v1";
const A = "01924b1e-7f32-7a81-9b12-45e8a1234567"; // proyek untuk alur berhasil
const B = "01924b1e-7f32-7a81-9b12-45e8a1234568"; // proyek untuk kasus gagal (checklist belum lengkap)
const UNKNOWN = "01924b1e-7f32-7a81-9b12-45e8a9999999";
const PM = "token-contoh-pm";

const calls = []; // log lengkap request dan respons
async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  calls.push({ request: `${method} ${path}`, token: token ?? null, body: body ?? null, status: res.status, response: json });
  return { status: res.status, json };
}

const rows = [];
function step(section, aksi, harapan, r, ok, terlihat) {
  const n = rows.filter((x) => x.section === section).length + 1;
  rows.push({ section, no: n, aksi, harapan, terlihat, lulus: ok });
  console.log(`[${ok ? "LULUS" : "GAGAL"}] ${section === "berhasil" ? "B" : "G"}${n}. ${aksi}\n        -> ${terlihat}`);
}

try {
  // ---------- Alur berhasil ----------
  let r = await call("GET", `/projects/${A}/monthly-reports/2026-10`, { token: PM });
  step("berhasil", "PM membuka laporan bulanan periode 2026-10 (GET .../monthly-reports/2026-10)",
    "200; status draft; risks dan issues terisi dari mock E-5; readyTarget 2026-10-26 (H-5)", r,
    r.status === 200 && r.json.status === "draft" && r.json.risks.length === 1 && r.json.issues.length === 1 && r.json.readyTarget === "2026-10-26",
    `HTTP ${r.status}; status=${r.json?.status}; risks=${r.json?.risks?.length}; issues=${r.json?.issues?.length}; readyTarget=${r.json?.readyTarget}`);

  r = await call("GET", `/projects/${A}/closure`, { token: PM });
  if (r.json?.status !== null || r.json?.checklistProgress !== 0) {
    console.error("Data sudah berubah dari seed (demo pernah dijalankan). Hentikan server lalu jalankan `npm start` lagi.");
    process.exit(2);
  }
  step("berhasil", "PM membuka closure proyek (GET .../closure)",
    "200; status null; checklistProgress 0; uatStatus belum_diajukan; checklistTargetDate 2026-12-08 (H-7)", r,
    r.status === 200 && r.json.checklistTargetDate === "2026-12-08" && r.json.uatStatus === "belum_diajukan",
    `HTTP ${r.status}; status=${r.json.status}; progress=${r.json.checklistProgress}; uatStatus=${r.json.uatStatus}; target checklist=${r.json.checklistTargetDate}`);

  let last;
  for (const code of ["FD-01", "DOC-01", "HND-01", "CLS-01"]) {
    last = await call("PATCH", `/projects/${A}/closure/checklist/${code}`, { token: PM, body: { done: true } });
  }
  step("berhasil", "PM mencentang item FD-01, DOC-01, HND-01, CLS-01 (PATCH .../checklist/{itemCode}, done=true)",
    "200 setiap item; checklistProgress akhir 80", last, last.status === 200 && last.json.checklistProgress === 80,
    `HTTP ${last.status}; progress=${last.json.checklistProgress}`);

  r = await call("PATCH", `/projects/${A}/closure/checklist/UAT-01`, { token: PM, body: { done: true, uatResult: "disetujui", evidenceNote: "Persetujuan UAT diterima dari klien (offline)" } });
  step("berhasil", "PM mencatat UAT disetujui klien (PATCH .../checklist/UAT-01, uatResult=disetujui)",
    "200; uatResult disetujui; checklistProgress 100", r, r.status === 200 && r.json.uatResult === "disetujui" && r.json.checklistProgress === 100,
    `HTTP ${r.status}; uatResult=${r.json.uatResult}; progress=${r.json.checklistProgress}`);

  const alur = [["siap_ditutup", {}], ["disetujui", {}], ["diserahterimakan", { handoverDate: "2026-10-28" }], ["ditutup", {}]];
  let prev = null;
  for (const [target, extra] of alur) {
    r = await call("PATCH", `/projects/${A}/closure/status`, { token: PM, body: { targetStatus: target, ...extra } });
    step("berhasil", `PM memindahkan status closure ke ${target} (PATCH .../closure/status)`,
      `200; previousStatus ${prev ?? "null"}; status ${target}`, r,
      r.status === 200 && r.json.status === target && r.json.previousStatus === prev,
      `HTTP ${r.status}; previousStatus=${r.json.previousStatus}; status=${r.json.status}; closedAt=${r.json.closedAt}`);
    prev = target;
  }

  r = await call("GET", `/projects/${A}/closure`, { token: PM });
  step("berhasil", "PM memeriksa hasil akhir (GET .../closure)",
    "status ditutup; closedAt terisi; handoverDate 2026-10-28; checklistProgress 100", r,
    r.json.status === "ditutup" && r.json.closedAt && r.json.handoverDate === "2026-10-28" && r.json.checklistProgress === 100,
    `status=${r.json.status}; closedAt=${r.json.closedAt}; handoverDate=${r.json.handoverDate}; progress=${r.json.checklistProgress}`);

  // ---------- Kasus gagal atau ditolak ----------
  r = await call("PATCH", `/projects/${B}/closure/status`, { token: PM, body: { targetStatus: "siap_ditutup" } });
  const after = await call("GET", `/projects/${B}/closure`, { token: PM });
  step("gagal", `Proyek B: PM meminta siap_ditutup saat checklist belum lengkap (UAT-01, HND-01 belum selesai)`,
    "409 CHECKLIST_INCOMPLETE; status closure tetap null dan progress tetap 60", r,
    r.status === 409 && r.json.code === "CHECKLIST_INCOMPLETE" && after.json.status === null && after.json.checklistProgress === 60,
    `HTTP ${r.status}; code=${r.json.code}; detail="${r.json.details?.[0]?.reason}"; setelah itu status=${after.json.status}, progress=${after.json.checklistProgress}`);

  r = await call("PATCH", `/projects/${A}/closure/status`, { token: PM, body: { targetStatus: "disetujui" } });
  step("gagal", "Proyek A (sudah ditutup): PM mencoba mengembalikan status ke disetujui",
    "409 INVALID_STATUS_TRANSITION", r, r.status === 409 && r.json.code === "INVALID_STATUS_TRANSITION",
    `HTTP ${r.status}; code=${r.json.code}; message="${r.json.message}"`);

  r = await call("GET", `/projects/${A}/closure`, { token: "token-contoh-pm-lain" });
  step("gagal", "PM proyek lain (token-contoh-pm-lain) membuka closure proyek A", "403 FORBIDDEN", r,
    r.status === 403 && r.json.code === "FORBIDDEN", `HTTP ${r.status}; code=${r.json.code}`);

  r = await call("GET", `/projects/${A}/closure`);
  step("gagal", "Tanpa token Authorization membuka closure proyek A", "401 UNAUTHORIZED", r,
    r.status === 401 && r.json.code === "UNAUTHORIZED", `HTTP ${r.status}; code=${r.json.code}`);

  r = await call("GET", `/projects/${UNKNOWN}/closure`, { token: PM });
  step("gagal", "PM membuka closure dengan projectId yang tidak dikenal D-1", "404 PROJECT_NOT_FOUND", r,
    r.status === 404 && r.json.code === "PROJECT_NOT_FOUND", `HTTP ${r.status}; code=${r.json.code}`);
} catch (e) {
  console.error(`\nTidak dapat menjalankan demo: ${e.message}\nPastikan server sudah berjalan (npm start) dan BASE_URL benar (${BASE}).`);
  process.exit(2);
}

// ---------- Tulis bukti ----------
const lulus = rows.filter((x) => x.lulus).length;
const esc = (s) => String(s).replace(/\|/g, "\\|");
const table = (section) => {
  const rs = rows.filter((x) => x.section === section);
  return [
    "| No | Aksi dan masukan | Hasil yang diharapkan | Hasil yang terlihat | Lulus |",
    "|---|---|---|---|---|",
    ...rs.map((x) => `| ${x.no} | ${esc(x.aksi)} | ${esc(x.harapan)} | ${esc(x.terlihat)} | ${x.lulus ? "ya" : "TIDAK"} |`),
  ].join("\n");
};
mkdirSync("demo-output", { recursive: true });
writeFileSync("demo-output/hasil-demo.md",
  `# Hasil demo D-3\n\nDijalankan: ${new Date().toISOString()}\nBase URL: ${BASE}\nNode.js: ${process.version}\nRingkasan: ${lulus} dari ${rows.length} langkah lulus\n\n## Alur berhasil\n\n${table("berhasil")}\n\n## Kasus gagal atau ditolak\n\n${table("gagal")}\n`);
writeFileSync("demo-output/hasil-demo.json", JSON.stringify({ baseUrl: BASE, langkah: rows, panggilan: calls }, null, 2) + "\n");
console.log(`\n${lulus} dari ${rows.length} langkah lulus. Bukti: demo-output/hasil-demo.md dan demo-output/hasil-demo.json`);
process.exit(lulus === rows.length ? 0 : 1);
