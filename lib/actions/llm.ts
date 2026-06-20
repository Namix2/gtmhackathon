"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { SIGNAL_BY_CATEGORY, type SignalCategory } from "@/lib/scoring";
import { scoreIndividual } from "@/lib/actions/scoring";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type LlmSignal = {
  category: string;
  confidence: number;
  excerpt: string;
};

type LlmResult = {
  signals: LlmSignal[];
  outreachAngle?: string;
};

function buildPrompt(
  contentBlocks: { id: string; text: string }[]
): { system: string; user: string } {
  const categories = Object.values(SIGNAL_BY_CATEGORY)
    .map((d) => `- ${d.category} (${d.group}): ${d.label}`)
    .join("\n");

  const corpus = contentBlocks
    .map((c, i) => `### Content ${i + 1} (id: ${c.id})\n${c.text}`)
    .join("\n\n");

  return {
    system:
      "You classify social content for a B2B prospecting tool. You identify which predefined signal categories are present and draft a one-line outreach angle. Respond ONLY with strict JSON.",
    user: `Valid signal categories:\n${categories}\n\nAnalyse the following content and return JSON of the form:\n{\n  "signals": [{ "category": "<one of the valid categories>", "confidence": <0..1>, "excerpt": "<short supporting quote>" }],\n  "outreachAngle": "<one concise sentence>"\n}\nOnly use categories from the list. Omit weak/uncertain signals.\n\n${corpus}`,
  };
}

// Optional LLM enrichment. Gated by OPENAI_API_KEY. Writes detectedBy="llm"
// SignalEvidence and refreshes the score; drafts an outreach angle.
export async function llmEnrichIndividual(individualId: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LLM enrichment is disabled: set OPENAI_API_KEY to enable it"
    );
  }

  const contentItems = await prisma.contentItem.findMany({
    where: { individualId },
    take: 20,
  });
  if (contentItems.length === 0) {
    throw new Error("No content to analyse");
  }

  const contentBlocks = contentItems.map((c) => ({
    id: c.id,
    text: [c.title, c.body].filter(Boolean).join("\n").slice(0, 2000),
  }));

  const { system, user } = buildPrompt(contentBlocks);

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error("LLM returned no content");

  let parsed: LlmResult;
  try {
    parsed = JSON.parse(raw) as LlmResult;
  } catch {
    throw new Error("LLM returned invalid JSON");
  }

  // Map the LLM signals to the first available content id for evidence linkage.
  const fallbackContentId = contentItems[0].id;

  // Replace prior LLM evidence for this individual.
  await prisma.signalEvidence.deleteMany({
    where: { individualId, detectedBy: "llm" },
  });

  const validSignals = (parsed.signals ?? []).filter(
    (s): s is LlmSignal =>
      typeof s?.category === "string" &&
      s.category in SIGNAL_BY_CATEGORY
  );

  if (validSignals.length > 0) {
    await prisma.signalEvidence.createMany({
      data: validSignals.map((s) => {
        const def = SIGNAL_BY_CATEGORY[s.category as SignalCategory];
        return {
          individualId,
          contentItemId: fallbackContentId,
          category: s.category,
          matchedPhrase: (s.excerpt ?? "").slice(0, 120) || def.label,
          weight: def.frustrationWeight ?? 0,
          confidence:
            typeof s.confidence === "number"
              ? Math.max(0, Math.min(1, s.confidence))
              : 0.7,
          detectedBy: "llm",
          excerpt: s.excerpt ?? null,
        };
      }),
    });
  }

  // Re-score with the new evidence included.
  await scoreIndividual(individualId);

  // Persist the LLM-drafted outreach angle on the freshest score.
  if (parsed.outreachAngle) {
    const latest = await prisma.prospectScore.findFirst({
      where: { individualId },
      orderBy: { computedAt: "desc" },
    });
    if (latest) {
      await prisma.prospectScore.update({
        where: { id: latest.id },
        data: { outreachAngle: parsed.outreachAngle },
      });
    }
  }

  revalidatePath("/individuals");
  revalidatePath(`/individuals/${individualId}`);

  return {
    signalsAdded: validSignals.length,
    outreachAngle: parsed.outreachAngle ?? null,
  };
}
