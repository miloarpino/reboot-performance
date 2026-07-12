import { mkdir, readFile, rm, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ACTION_NAMES } from "../src/actions.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, "src"), join(dist, "src"), { recursive: true });

const html = await readFile(join(root, "index.html"), "utf8");
await writeFile(join(dist, "index.html"), html, "utf8");

const sourceFiles = [
  join(root, "index.html"),
  join(root, "src", "main.mjs")
];
const allSource = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
const usedActions = [...allSource.matchAll(/data-action="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((action) => !action.includes("${"));
const missing = usedActions.filter((action) => !ACTION_NAMES.includes(action));
if (missing.length) {
  throw new Error(`Boutons visibles sans action declaree: ${[...new Set(missing)].join(", ")}`);
}

const forbiddenLegacyImport = allSource.includes("reboot-performance.html");
if (forbiddenLegacyImport) {
  throw new Error("Le nouveau socle ne doit pas importer l'ancien fichier HTML.");
}

console.log("Build Phase 3 OK: dist/ genere, actions verifiees, ancien HTML non importe.");
