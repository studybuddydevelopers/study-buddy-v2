import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function validateNodeRuntime({ packageVersion, nvmVersion, actualVersion }) {
  const expected = String(packageVersion ?? "").trim();
  const nvm = String(nvmVersion ?? "").trim().replace(/^v/, "");
  const actual = String(actualVersion ?? "").trim().replace(/^v/, "");
  const problems = [];

  if (!expected) problems.push("package.json engines.node is missing");
  if (!nvm) problems.push(".nvmrc is missing or empty");
  if (expected && nvm && expected !== nvm) {
    problems.push(`package.json (${expected}) and .nvmrc (${nvm}) disagree`);
  }
  if (expected && actual && expected !== actual) {
    problems.push(`running Node ${actual}; expected ${expected}`);
  }

  return { expected, nvm, actual, problems };
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const result = validateNodeRuntime({
    packageVersion: packageJson.engines?.node,
    nvmVersion: fs.readFileSync(".nvmrc", "utf8"),
    actualVersion: process.versions.node,
  });

  if (result.problems.length > 0) {
    console.error(`Node runtime contract failed: ${result.problems.join("; ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Node runtime contract verified: ${result.actual}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

