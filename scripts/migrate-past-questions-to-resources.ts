import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { migrateLegacyPastQuestions } from "../lib/resources/past-question-migration";

interface CliOptions {
  dryRun: boolean;
  limit?: number;
  reportPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: true };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.dryRun = false;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(value) && value > 0) options.limit = value;
      continue;
    }
    if (arg.startsWith("--report=")) {
      options.reportPath = arg.slice("--report=".length);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await migrateLegacyPastQuestions({
    dryRun: options.dryRun,
    limit: options.limit,
  });
  const output = JSON.stringify(report, null, 2);

  if (options.reportPath) {
    const resolved = path.resolve(options.reportPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, `${output}\n`);
  }

  console.log(output);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
