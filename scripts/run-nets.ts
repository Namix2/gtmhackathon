// Standalone net runner for scheduled ingestion (cron / systemd timer).
//
// Usage:
//   npx tsx scripts/run-nets.ts            # run every active net
//   npx tsx scripts/run-nets.ts <netId>    # run a single net
//
// Safe to run outside the Next.js server: uses the shared pipeline core, which
// performs no cache revalidation. Honors the same concurrency guard as the UI.

import { prisma } from "../lib/db";
import { runNetPipeline, RunInProgressError } from "../lib/pipeline";

async function main() {
  const onlyNetId = process.argv[2];

  const nets = await prisma.net.findMany({
    where: onlyNetId ? { id: onlyNetId } : { isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  if (nets.length === 0) {
    console.log(onlyNetId ? "No net with that id." : "No active nets to run.");
    return;
  }

  console.log(`Running ${nets.length} net(s)…`);
  let failures = 0;

  for (const net of nets) {
    try {
      const result = await runNetPipeline(net.id);
      console.log(
        `[${result.status}] ${net.name}: ` +
          `${result.candidates} candidates, ${result.content} content, ` +
          `${result.metrics} metrics, ${result.profiles} profiles` +
          (result.errorCount ? `, ${result.errorCount} source error(s)` : "")
      );
      if (result.status === "failed") failures += 1;
    } catch (error) {
      failures += 1;
      if (error instanceof RunInProgressError) {
        console.warn(`[skipped] ${net.name}: run already in progress`);
      } else {
        console.error(
          `[error] ${net.name}: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }

  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
