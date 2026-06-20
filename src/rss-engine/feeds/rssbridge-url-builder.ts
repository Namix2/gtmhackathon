// RSS-Bridge feed-URL builder. Pure string construction. Pattern from
// 07_source_category_feed_generation.md:
//   {RSSBRIDGE_BASE_URL}?action=display&bridge={BridgeName}&format=Atom

export type RssBridgeFormat = "Atom" | "Html" | "Json" | "MediaRSS";

export function buildRssBridgeUrl(
  baseUrl: string,
  input: {
    bridge: string;
    params?: Record<string, string>;
    format?: RssBridgeFormat;
  }
): string {
  const search = new URLSearchParams();
  search.set("action", "display");
  search.set("bridge", input.bridge);
  search.set("format", input.format ?? "Atom");
  for (const [key, value] of Object.entries(input.params ?? {})) {
    search.set(key, value);
  }
  const normalizedBase = baseUrl.replace(/\?+$/, "");
  const separator = normalizedBase.includes("?") ? "&" : "?";
  return `${normalizedBase}${separator}${search.toString()}`;
}
