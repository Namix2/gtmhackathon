"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { runNetPipeline, type RunResult } from "@/lib/pipeline";

export async function getNetRuns(netId?: string) {
  return prisma.netRun.findMany({
    where: netId ? { netId } : undefined,
    include: { net: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
}

export async function runNet(netId: string): Promise<RunResult> {
  const result = await runNetPipeline(netId);
  revalidatePath("/nets");
  revalidatePath("/candidates");
  return result;
}
