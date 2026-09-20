import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const targetDir = path.resolve(process.cwd(), "data", "golden-path-repo");
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

execSync("git init -b main", { cwd: targetDir });
execSync('git config user.name "Golden Path Agent"', { cwd: targetDir });
execSync('git config user.email "agent@aioffice.dev"', { cwd: targetDir });

fs.writeFileSync(path.join(targetDir, "package.json"), JSON.stringify({
  name: "auth-service",
  version: "1.0.0",
  scripts: { test: "node test.cjs" }
}, null, 2));

fs.writeFileSync(path.join(targetDir, "auth.js"), "// Auth service placeholder\nmodule.exports = {};\n");
fs.writeFileSync(path.join(targetDir, "test.cjs"), 'const assert = require("assert");\nconsole.log("Tests pass!");\n');

execSync("git add .", { cwd: targetDir });
execSync('git commit -m "chore: initial commit"', { cwd: targetDir });
console.log("Created golden path test repository at:", targetDir);
