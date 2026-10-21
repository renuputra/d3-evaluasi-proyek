# Change log kontrak API D-3

## v0.2.0 - 2026-10-21
- Contoh `projectId` memakai UUID v7 mengikuti D-1 (menurut dokumen OpenAPI E-3; D-1 v0.1 diterima 2026-10-19).
- Semua operasi menambah respons `503 DEPENDENCY_UNAVAILABLE` (F-1, D-1, atau E-5 tidak dapat dihubungi), gaya yang sama dengan E-3.
- Contoh `risks` dan `issues` mengikuti gaya E-5: ID UUID, status `OPEN` / `IN_PROGRESS` / `CLOSED`. Nilai E-5 diteruskan apa adanya.
- Perbaikan: `uatResult` pada respons API-K03-03 kini boleh `null` (untuk item selain UAT).
- Belum berubah (menunggu jawaban kelompok lain): kode error bersama, metode token F-1, pemetaan employeeId ke userId, sumber milestone dan resource (E-3), isi item `riskIssues[]` (E-5).

## v0.1.0 - 2026-10-20
- Versi awal: API-K03-01 sampai API-K03-04 (laporan bulanan, status closure, checklist closing, alur status closure).
