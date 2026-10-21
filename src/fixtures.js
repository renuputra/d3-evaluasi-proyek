import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../fixtures/", import.meta.url));
export const loadFixture = (name) => JSON.parse(readFileSync(dir + name, "utf-8"));
