"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createSourceSchema,
  sourceKeySchema,
  updateSourceSchema,
  type CreateSourceValues,
} from "@/lib/validators";
import {
  defaultSourceConfig,
  sourceConfigSchemas,
  type SourceConfigValues,
} from "@/lib/validators/source-config";

export async function getSources() {
  return prisma.source.findMany({
    orderBy: { label: "asc" },
  });
}

export async function getSourceByKey(key: string) {
  return prisma.source.findUnique({
    where: { key },
  });
}

export async function createSource(values: CreateSourceValues) {
  const parsed = createSourceSchema.parse(values);

  const existing = await prisma.source.findUnique({
    where: { key: parsed.key },
  });
  if (existing) {
    throw new Error("A source for this platform already exists");
  }

  await prisma.source.create({
    data: {
      key: parsed.key,
      label: parsed.label,
      enabled: false,
      config: defaultSourceConfig(parsed.key) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/sources");
  revalidatePath("/nets");
}

export async function toggleSourceEnabled(id: string, enabled: boolean) {
  const parsed = updateSourceSchema.parse({ id, enabled });
  const source = await prisma.source.update({
    where: { id: parsed.id },
    data: { enabled: parsed.enabled },
  });
  revalidatePath("/sources");
  revalidatePath(`/sources/${source.key}`);
}

export async function updateSourceConfig(
  id: string,
  key: string,
  config: SourceConfigValues
) {
  const parsedKey = sourceKeySchema.parse(key);
  const schema = sourceConfigSchemas[parsedKey];
  const parsedConfig = schema.parse(config);
  const parsed = updateSourceSchema.parse({ id, config: parsedConfig });

  const source = await prisma.source.update({
    where: { id: parsed.id },
    data: { config: parsedConfig as Prisma.InputJsonValue },
  });

  revalidatePath("/sources");
  revalidatePath(`/sources/${source.key}`);
}
