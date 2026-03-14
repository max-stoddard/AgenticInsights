import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(testDir, "../public");

describe("branding assets", () => {
  it("keeps the favicon aligned with the Agentic Insights logo", () => {
    const favicon = fs.readFileSync(path.join(publicDir, "favicon.svg"), "utf8").trim();
    const logo = fs.readFileSync(path.join(publicDir, "agent.svg"), "utf8").trim();

    expect(favicon).toBe(logo);
  });
});
