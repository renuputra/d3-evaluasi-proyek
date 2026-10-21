import { createMockSources } from "../src/mock-sources.js";
import { createApp } from "../src/app.js";
import { createSources } from "../src/sources.js";
import { createStore } from "../src/store.js";

export const A = "01924b1e-7f32-7a81-9b12-45e8a1234567";
export const B = "01924b1e-7f32-7a81-9b12-45e8a1234568";
const listen = (app) => new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });

export async function startAll({ d1BaseUrl } = {}) {
  const mock = await listen(createMockSources());
  const mockUrl = `http://localhost:${mock.address().port}`;
  const sources = createSources({ f1BaseUrl: mockUrl, d1BaseUrl: d1BaseUrl ?? mockUrl, e5BaseUrl: mockUrl, timeoutMs: 500 });
  const app = await listen(createApp({ sources, store: createStore(), clock: () => "2026-10-21T10:00:00+07:00" }));
  const base = `http://localhost:${app.address().port}/api/v1`;
  return {
    base,
    close() { for (const s of [app, mock]) { s.closeAllConnections(); s.close(); } },
  };
}

export async function call(base, method, path, { token = "token-contoh-pm", body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
