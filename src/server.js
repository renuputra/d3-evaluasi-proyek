import { createApp } from "./app.js";
import { createMockSources } from "./mock-sources.js";
import { createSources } from "./sources.js";

const port = Number(process.env.PORT ?? 3003);
const mockPort = Number(process.env.MOCK_PORT ?? 4010);
const mockBase = `http://localhost:${mockPort}`;

if ((process.env.START_MOCK ?? "true") === "true") {
  createMockSources().listen(mockPort, () => console.log(`Mock F-1, D-1, E-5 (fiktif) aktif di ${mockBase}`));
}

const sources = createSources({
  f1BaseUrl: process.env.F1_BASE_URL ?? mockBase,
  d1BaseUrl: process.env.D1_BASE_URL ?? mockBase,
  e5BaseUrl: process.env.E5_BASE_URL ?? mockBase,
});

createApp({ sources }).listen(port, () => {
  console.log(`Layanan D-3 aktif di http://localhost:${port}/api/v1`);
  console.log("Data awal (seed) di memori; jalankan ulang server untuk mengembalikannya.");
});
