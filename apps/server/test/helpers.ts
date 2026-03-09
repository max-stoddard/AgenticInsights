import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TestCodexHome {
  dir: string;
  cleanup: () => void;
}

export interface TestCacheDir {
  dir: string;
  cleanup: () => void;
}

export function createCodexHome(): TestCodexHome {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-insights-"));
  fs.mkdirSync(path.join(dir, "sessions", "2026", "03", "09"), { recursive: true });
  fs.mkdirSync(path.join(dir, "archived_sessions"), { recursive: true });
  fs.mkdirSync(path.join(dir, "log"), { recursive: true });
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

export function createCacheDir(): TestCacheDir {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-insights-cache-"));
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

export function writeJsonlFile(root: string, relativePath: string, rows: unknown[]): string {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, rows.map((row) => JSON.stringify(row)).join("\n"));
  return fullPath;
}

export function writeTuiLog(root: string, content: string): void {
  fs.writeFileSync(path.join(root, "log", "codex-tui.log"), content);
}
