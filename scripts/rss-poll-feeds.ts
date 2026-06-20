import { pollDueFeeds } from "@/lib/rss-engine/feeds/feed-poller";

async function main() {
  const results = await pollDueFeeds(Number(process.env.RSS_POLL_LIMIT ?? "20"));
  console.log(JSON.stringify({ polled: results.length, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });
