// Content extraction / cleanup. Feed bodies are frequently HTML; downstream
// classification and hashing want clean plain text.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#34": '"',
};

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#?\w+);/g, (match, code: string) => {
    if (code.startsWith("#")) {
      const num = code.startsWith("#x") || code.startsWith("#X")
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function extractText(html: string | undefined, maxLength = 8000): string {
  if (!html) return "";
  const text = normalizeWhitespace(decodeEntities(stripHtml(html)));
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function buildSummary(
  summary: string | undefined,
  contentText: string,
  maxLength = 400
): string | undefined {
  const base = summary ? extractText(summary, maxLength * 2) : contentText;
  if (!base) return undefined;
  return base.length > maxLength ? `${base.slice(0, maxLength).trimEnd()}…` : base;
}
