# D-3: Pelaporan, penutupan, dan evaluasi proyek

Layanan D-3 untuk ERP PT Anaheim Nimbus Universal (Kelas D, Kelompok 3). Versi kontrak: **v0.2.0** (draf).
Repositori ini berisi kontrak API (`openapi.yaml`), layanan Node.js kecil yang mengikuti kontrak itu, mock untuk
layanan kelompok lain, dan skrip demo alur lokal pertama. **Semua data fiktif.**

## Isi repositori

| Lokasi | Isi |
|---|---|
| `openapi.yaml` | Kontrak OpenAPI 3.0.3: 4 operasi (API-K03-01 sampai 04) |
| `examples/` | Contoh JSON fiktif: sukses dan gagal (sama persis dengan contoh di `openapi.yaml`) |
| `src/` | Layanan D-3 (`app.js`), klien layanan lain (`sources.js`), mock F-1/D-1/E-5 (`mock-sources.js`) |
| `fixtures/` | Data fiktif (proyek, token contoh, closure, laporan, data E-5) |
| `scripts/demo.js` | Skrip demo; menulis bukti ke `demo-output/` |
| `test/` | Tes otomatis (`npm test`) |
| `CHANGELOG.md` | Perubahan kontrak |

## Menjalankan aplikasi

Prasyarat: Node.js 22 (minimal 20) dan npm. Tidak perlu database.

```bash
npm ci          # pasang dependensi
npm start       # D-3 di http://localhost:3003/api/v1, mock F-1/D-1/E-5 di http://localhost:4010
```

Di terminal lain:

```bash
npm run demo    # menjalankan alur berhasil dan kasus gagal; bukti di demo-output/hasil-demo.md dan .json
npm test        # tes otomatis
```

Data disimpan di memori. Untuk mengulang demo dari data awal, hentikan server (Ctrl+C) lalu `npm start` lagi.

Coba manual (contoh):

```bash
curl -H "Authorization: Bearer token-contoh-pm" \
  http://localhost:3003/api/v1/projects/01924b1e-7f32-7a81-9b12-45e8a1234567/closure
```

## Data fiktif

| Token contoh | Pengguna | Keterangan |
|---|---|---|
| `token-contoh-pm` | USR-0042 / EMP-0042 | PM proyek A dan B |
| `token-contoh-pm-lain` | USR-0099 / EMP-0099 | PM, tetapi bukan PM proyek A/B (uji 403) |
| `token-contoh-tenaga-ahli` | USR-0108 / EMP-0108 | Peran TW (uji 403) |

| Proyek | projectId | Kondisi awal closure |
|---|---|---|
| A | `01924b1e-7f32-7a81-9b12-45e8a1234567` | Semua item checklist belum selesai (alur berhasil) |
| B | `01924b1e-7f32-7a81-9b12-45e8a1234568` | UAT-01 dan HND-01 belum selesai (kasus gagal 409) |

Token di atas hanya contoh. Tidak ada kredensial asli di repositori ini. Jangan commit file `.env`.

## Mock dan asumsi

| Layanan | Endpoint yang ditiru | Status kontrak |
|---|---|---|
| F-1 | `GET /api/v1/auth/validate` | **ASUMSI.** Kontrak F-1 (API-F1-05) belum terbit. Mock membalas userId, employeeId, roles |
| D-1 | `GET /api/v1/projects/{projectId}` (API-K01-07) | Field mengikuti kutipan di dokumen E-3: projectId, projectName, clientName, status, pmEmployeeId |
| E-5 | `GET /api/v1/projects/{projectId}/control-data` (API-K05-09) | Field tingkat atas mengikuti OpenAPI E-5 v0.1 (13 Okt 2026). Isi item `riskIssues[]` masih **ASUMSI** |

Belum terintegrasi: progres dan tugas (E-4), milestone dan resource (E-3), tanggal kontrak selesai (D-2, sementara dari seed).
Laporan bulanan mengembalikan `progressPercent: null` serta array kosong untuk bagian itu.

## Layanan tidak siap (503)

Bila F-1, D-1, atau E-5 tidak dapat dihubungi, D-3 membalas `503 DEPENDENCY_UNAVAILABLE`. Coba manual:

```bash
# macOS/Linux
D1_BASE_URL=http://localhost:4999 npm start
```
```powershell
# Windows PowerShell
$env:D1_BASE_URL="http://localhost:4999"; npm start
```

Lalu panggil endpoint apa pun dengan `token-contoh-pm`. Kasus ini juga dicek oleh `test/dependency.test.js`.

## Mengganti mock dengan API nyata

Atur variabel lingkungan (lihat `.env.example`): `F1_BASE_URL`, `D1_BASE_URL`, `E5_BASE_URL`, dan `START_MOCK=false`.
Setelah itu jalankan ulang `npm test` dan `npm run demo` terhadap layanan nyata, lalu cocokkan field, status HTTP, dan ID.

## Kesesuaian dengan kontrak

Server memvalidasi setiap request dan respons terhadap `openapi.yaml` (`express-openapi-validator`). Respons yang
melanggar kontrak ditolak dengan 500, sehingga demo dan tes yang lulus berarti respons sesuai skema.
CI (`.github/workflows/check.yml`) menjalankan `npm test` dan lint OpenAPI pada setiap push.

## Batas saat ini

- **Nyata:** empat operasi D-3, aturan transisi status closure, aturan akses PM, validasi terhadap `openapi.yaml`.
- **Mock:** F-1, D-1, E-5.
- **Belum dibuat:** tampilan (UI), database, integrasi E-3/E-4/D-2, pembuatan closure (POST), daftar item checklist final (menunggu SOP-09 dan WI-07/WI-08).

## Contoh keluaran `npm run demo`

Waktu pada `closedAt` akan berbeda pada setiap menjalankan.

```
[LULUS] B1. PM membuka laporan bulanan periode 2026-10 (GET .../monthly-reports/2026-10)
        -> HTTP 200; status=draft; risks=1; issues=1; readyTarget=2026-10-26
...
[LULUS] B8. PM memindahkan status closure ke ditutup (PATCH .../closure/status)
        -> HTTP 200; previousStatus=diserahterimakan; status=ditutup; closedAt=2026-10-21T11:39:33+07:00
[LULUS] G1. Proyek B: PM meminta siap_ditutup saat checklist belum lengkap (UAT-01, HND-01 belum selesai)
        -> HTTP 409; code=CHECKLIST_INCOMPLETE; detail="Item belum selesai: UAT-01, HND-01"; setelah itu status=null, progress=60
...
14 dari 14 langkah lulus. Bukti: demo-output/hasil-demo.md dan demo-output/hasil-demo.json
```
