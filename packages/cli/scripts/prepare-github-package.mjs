import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageDir, "../..");
const outputDir = path.join(packageDir, ".github-package");
const distDir = path.join(packageDir, "dist");
const readmePath = path.join(packageDir, "README.md");
const licensePath = path.join(repoRoot, "LICENSE");
const packageJsonPath = path.join(packageDir, "package.json");

function assertPathExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected path to exist: ${filePath}`);
  }
}

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, dirent.name);
    const targetPath = path.join(targetDir, dirent.name);

    if (dirent.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }

    if (dirent.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

assertPathExists(distDir);
assertPathExists(readmePath);
assertPathExists(licensePath);
assertPathExists(packageJsonPath);

const cliPackage = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

fs.rmSync(outputDir, { recursive: true, force: true });
copyDir(distDir, path.join(outputDir, "dist"));
fs.copyFileSync(readmePath, path.join(outputDir, "README.md"));
fs.copyFileSync(licensePath, path.join(outputDir, "LICENSE"));

fs.writeFileSync(
  path.join(outputDir, "package.json"),
  JSON.stringify(
    {
      name: "@max-stoddard/agentic-insights",
      version: cliPackage.version,
      description: cliPackage.description,
      license: cliPackage.license,
      type: cliPackage.type,
      repository: {
        type: "git",
        url: "git+https://github.com/max-stoddard/agentic-insights.git"
      },
      homepage: "https://github.com/max-stoddard/agentic-insights#readme",
      bugs: {
        url: "https://github.com/max-stoddard/agentic-insights/issues"
      },
      bin: {
        "agentic-insights": "./dist/index.js"
      },
      files: ["dist"],
      engines: cliPackage.engines,
      publishConfig: {
        registry: "https://npm.pkg.github.com"
      }
    },
    null,
    2
  )
);
