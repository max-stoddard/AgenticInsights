import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../..");

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

describe("release metadata", () => {
  it("keeps workspace versions aligned", () => {
    const rootPackage = readJson("package.json");
    const cliPackage = readJson("packages/cli/package.json");
    const serverPackage = readJson("apps/server/package.json");
    const webPackage = readJson("apps/web/package.json");
    const sharedPackage = readJson("packages/shared/package.json");

    expect(rootPackage.version).toBe("0.2.0");
    expect(cliPackage.version).toBe(rootPackage.version);
    expect(serverPackage.version).toBe(rootPackage.version);
    expect(webPackage.version).toBe(rootPackage.version);
    expect(sharedPackage.version).toBe(rootPackage.version);
    expect(serverPackage.dependencies["@agentic-insights/shared"]).toBe(rootPackage.version);
    expect(webPackage.dependencies["@agentic-insights/shared"]).toBe(rootPackage.version);
  });

  it("includes release notes for the current tag", () => {
    const cliPackage = readJson("packages/cli/package.json");
    const releaseNotesPath = path.join(repoRoot, ".github", "release-notes", `v${cliPackage.version}.md`);

    expect(fs.existsSync(releaseNotesPath)).toBe(true);
    expect(fs.readFileSync(releaseNotesPath, "utf8")).toContain("major UI and visualisation improvements");
  });
});
