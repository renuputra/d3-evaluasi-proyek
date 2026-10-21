// Waktu mengikuti keputusan D-1/E-3: ISO 8601 dengan offset +07:00 (Asia/Jakarta).
export function nowWib(date = new Date()) {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "+07:00");
}

// Tanggal YYYY-MM-DD dikurangi/ditambah sejumlah hari.
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
