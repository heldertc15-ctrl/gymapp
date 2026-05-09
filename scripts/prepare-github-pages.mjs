import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "out");
const docsDir = resolve(root, "docs");

await rm(docsDir, { recursive: true, force: true });
await cp(outDir, docsDir, { recursive: true });
