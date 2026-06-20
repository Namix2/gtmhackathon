"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  netFormSchema,
  paramsArrayToObject,
  type NetFormValues,
} from "@/lib/validators";

export async function getNets() {
  return prisma.net.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sources: {
        include: { source: true },
      },
      netRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { rawCandidates: true } },
    },
  });
}

export async function getNetById(id: string) {
  return prisma.net.findUnique({
    where: { id },
    include: {
      sources: true,
    },
  });
}

export async function getEnabledSources() {
  return prisma.source.findMany({
    where: { enabled: true },
    orderBy: { label: "asc" },
  });
}

export async function getAllSourcesForNets() {
  return prisma.source.findMany({
    orderBy: { label: "asc" },
  });
}

export async function createNet(values: NetFormValues) {
  const parsed = netFormSchema.parse(values);
  const params = paramsArrayToObject(parsed.params);

  await prisma.net.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      isActive: parsed.isActive,
      icpTarget: parsed.icpTarget,
      params,
      sources: {
        create: parsed.sourceIds.map((sourceId) => ({ sourceId })),
      },
    },
  });

  revalidatePath("/nets");
}

export async function updateNet(id: string, values: NetFormValues) {
  const parsed = netFormSchema.parse(values);
  const params = paramsArrayToObject(parsed.params);

  await prisma.$transaction([
    prisma.netSource.deleteMany({ where: { netId: id } }),
    prisma.net.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description || null,
        isActive: parsed.isActive,
        icpTarget: parsed.icpTarget,
        params,
        sources: {
          create: parsed.sourceIds.map((sourceId) => ({ sourceId })),
        },
      },
    }),
  ]);

  revalidatePath("/nets");
}

export async function deleteNet(id: string) {
  await prisma.net.delete({ where: { id } });
  revalidatePath("/nets");
}
