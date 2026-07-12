import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const fileName of [".env", ".env.local"]) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) continue;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
