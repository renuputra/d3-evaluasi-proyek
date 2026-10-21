import { test } from "node:test";
import assert from "node:assert/strict";
import { startAll, call, A } from "../testlib/helpers.js";

test("D-1 tidak dapat dihubungi: D-3 membalas 503 DEPENDENCY_UNAVAILABLE", async () => {
  const ctx = await startAll({ d1BaseUrl: "http://localhost:1" }); // port tidak aktif
  try {
    const r = await call(ctx.base, "GET", `/projects/${A}/closure`);
    assert.equal(r.status, 503);
    assert.equal(r.json.code, "DEPENDENCY_UNAVAILABLE");
    assert.match(r.json.message, /D-1/);
  } finally {
    ctx.close();
  }
});
