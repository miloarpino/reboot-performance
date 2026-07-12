import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", ".next", "node_modules", "dist", "coverage", "playwright-report", "test-results"]);
const ignoredFiles = new Set([".env.local", "secret-audit.mjs"]);
const allowedPatterns = [
  /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/,
  /SUPABASE_SERVICE_ROLE_KEY=/,
  /OPENAI_API_KEY=/,
  /SEED_PASSWORD=/,
  /mot-de-passe-invalide/
];

const secretPatterns = [
  { name: "Supabase service role", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*.+/ },
  { name: "OpenAI key", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase JWT", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: "Seed password", pattern: /SEED_PASSWORD\s*=\s*.+/ },
  { name: "Generic password assignment", pattern: /(password|mot_de_passe|secret)\s*[:=]\s*["'][^"']{8,}["']/i }
];

const findings = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) await walk(fullPath);
      continue;
    }
    if (ignoredFiles.has(entry.name)) continue;
    if (entry.name.endsWith(".png") || entry.name.endsWith(".jpg") || entry.name.endsWith(".jpeg") || entry.name.endsWith(".gif")) continue;
    await scanFile(fullPath, relative);
  }
}

async function scanFile(fullPath, relative) {
  const content = await readFile(fullPath, "utf8").catch(() => "");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/mot-de-passe-invalide/.test(line)) return;
    if (allowedPatterns.some((pattern) => pattern.test(line) && relative === ".env.example")) return;
    for (const secret of secretPatterns) {
      if (secret.pattern.test(line)) {
        findings.push(`${relative}:${index + 1} ${secret.name}`);
      }
    }
  });
}

await walk(root);

if (findings.length) {
  console.error("Secret audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret audit OK: no obvious secrets in versionable files.");
