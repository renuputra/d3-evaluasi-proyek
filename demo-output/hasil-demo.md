# Hasil demo D-3

Dijalankan: 2026-10-21T15:05:47.334Z
Base URL: http://localhost:3003/api/v1
Node.js: v25.2.1
Ringkasan: 14 dari 14 langkah lulus

## Alur berhasil

| No | Aksi dan masukan | Hasil yang diharapkan | Hasil yang terlihat | Lulus |
|---|---|---|---|---|
| 1 | PM membuka laporan bulanan periode 2026-10 (GET .../monthly-reports/2026-10) | 200; status draft; risks dan issues terisi dari mock E-5; readyTarget 2026-10-26 (H-5) | HTTP 200; status=draft; risks=1; issues=1; readyTarget=2026-10-26 | ya |
| 2 | PM membuka closure proyek (GET .../closure) | 200; status null; checklistProgress 0; uatStatus belum_diajukan; checklistTargetDate 2026-12-08 (H-7) | HTTP 200; status=null; progress=0; uatStatus=belum_diajukan; target checklist=2026-12-08 | ya |
| 3 | PM mencentang item FD-01, DOC-01, HND-01, CLS-01 (PATCH .../checklist/{itemCode}, done=true) | 200 setiap item; checklistProgress akhir 80 | HTTP 200; progress=80 | ya |
| 4 | PM mencatat UAT disetujui klien (PATCH .../checklist/UAT-01, uatResult=disetujui) | 200; uatResult disetujui; checklistProgress 100 | HTTP 200; uatResult=disetujui; progress=100 | ya |
| 5 | PM memindahkan status closure ke siap_ditutup (PATCH .../closure/status) | 200; previousStatus null; status siap_ditutup | HTTP 200; previousStatus=null; status=siap_ditutup; closedAt=null | ya |
| 6 | PM memindahkan status closure ke disetujui (PATCH .../closure/status) | 200; previousStatus siap_ditutup; status disetujui | HTTP 200; previousStatus=siap_ditutup; status=disetujui; closedAt=null | ya |
| 7 | PM memindahkan status closure ke diserahterimakan (PATCH .../closure/status) | 200; previousStatus disetujui; status diserahterimakan | HTTP 200; previousStatus=disetujui; status=diserahterimakan; closedAt=null | ya |
| 8 | PM memindahkan status closure ke ditutup (PATCH .../closure/status) | 200; previousStatus diserahterimakan; status ditutup | HTTP 200; previousStatus=diserahterimakan; status=ditutup; closedAt=2026-10-21T22:05:47+07:00 | ya |
| 9 | PM memeriksa hasil akhir (GET .../closure) | status ditutup; closedAt terisi; handoverDate 2026-10-28; checklistProgress 100 | status=ditutup; closedAt=2026-10-21T22:05:47+07:00; handoverDate=2026-10-28; progress=100 | ya |

## Kasus gagal atau ditolak

| No | Aksi dan masukan | Hasil yang diharapkan | Hasil yang terlihat | Lulus |
|---|---|---|---|---|
| 1 | Proyek B: PM meminta siap_ditutup saat checklist belum lengkap (UAT-01, HND-01 belum selesai) | 409 CHECKLIST_INCOMPLETE; status closure tetap null dan progress tetap 60 | HTTP 409; code=CHECKLIST_INCOMPLETE; detail="Item belum selesai: UAT-01, HND-01"; setelah itu status=null, progress=60 | ya |
| 2 | Proyek A (sudah ditutup): PM mencoba mengembalikan status ke disetujui | 409 INVALID_STATUS_TRANSITION | HTTP 409; code=INVALID_STATUS_TRANSITION; message="Status ditutup tidak dapat langsung menjadi disetujui" | ya |
| 3 | PM proyek lain (token-contoh-pm-lain) membuka closure proyek A | 403 FORBIDDEN | HTTP 403; code=FORBIDDEN | ya |
| 4 | Tanpa token Authorization membuka closure proyek A | 401 UNAUTHORIZED | HTTP 401; code=UNAUTHORIZED | ya |
| 5 | PM membuka closure dengan projectId yang tidak dikenal D-1 | 404 PROJECT_NOT_FOUND | HTTP 404; code=PROJECT_NOT_FOUND | ya |
