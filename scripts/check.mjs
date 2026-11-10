// Syntax-checks every JavaScript module in the project with the Node runtime.
// No dependencies and no build step: it only runs `node --check` on each file.
//   node scripts/check.mjs
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const folders = ["js", "data", "scripts", "tests"];

let checked = 0;
let failed = 0;

for (const folder of folders) {
  let entries;
  try {
    entries = await readdir(join(root, folder));
  } catch (error) {
    continue;
  }
  const files = entries.filter(function (name) {
    return name.endsWith(".js") || name.endsWith(".mjs");
  }).sort();

  for (const name of files) {
    const file = join(root, folder, name);
    checked += 1;
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (error) {
      failed += 1;
      const detail = error.stderr ? error.stderr.toString().trim() : error.message;
      console.error("Syntax error: " + folder + "/" + name);
      console.error(detail);
      console.error("");
    }
  }
}

console.log("Checked " + checked + " files: " + (failed ? failed + " failed" : "all OK"));
process.exitCode = failed ? 1 : 0;
