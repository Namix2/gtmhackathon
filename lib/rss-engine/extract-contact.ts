export type ContactInfo = {
  emails: string[];
  twitter: string[];
  linkedin: string[];
  github: string[];
  youtube: string[];
  substack: string[];
  mastodon: string[];
  websites: string[];
};

export const EMPTY_CONTACT: ContactInfo = {
  emails: [],
  twitter: [],
  linkedin: [],
  github: [],
  youtube: [],
  substack: [],
  mastodon: [],
  websites: [],
};

function extractHrefUrls(html: string): string[] {
  return [
    ...html.matchAll(/href=["']([^"']+)["']/gi),
  ]
    .map((m) => m[1])
    .filter((u): u is string => Boolean(u));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function parseRssAuthorField(author?: string | null): Partial<ContactInfo> {
  if (!author) return {};
  const emailMatch = author.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  const paren = author.match(/\(([^)]+)\)/);
  const out: Partial<ContactInfo> = {};
  if (emailMatch?.[1]) out.emails = [emailMatch[1].toLowerCase()];
  if (paren?.[1] && !paren[1].includes("@")) {
    // display name only — no URL extraction here
  }
  return out;
}

const SOCIAL_HOSTS =
  /(?:twitter\.com|x\.com|linkedin\.com|github\.com|youtube\.com|youtu\.be|substack\.com|mastodon\.|bsky\.app)/i;

export function extractContactInfo(
  input: {
    text?: string | null;
    author?: string | null;
    urls?: string[];
  } = {}
): ContactInfo {
  const rawText = [input.author, input.text].filter(Boolean).join("\n");
  const hrefUrls = extractHrefUrls(rawText);
  const text = stripHtml(rawText);
  const urlHaystack = [
    ...(input.urls ?? []),
    ...hrefUrls,
    ...(text.match(/https?:\/\/[^\s<>"')]+/gi) ?? []),
  ];

  const emails = unique([
    ...(parseRssAuthorField(input.author).emails ?? []),
    ...(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).map(
      (e) => e.toLowerCase()
    ),
  ]).filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg"));

  const twitter = unique([
    ...(text.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})/gi) ?? []).map(
      (m) => {
        const match = m.match(/\/([A-Za-z0-9_]{1,15})$/i);
        return match?.[1] ? `@${match[1]}` : m;
      }
    ),
    ...(text.match(/(?<![A-Za-z0-9_.])@([A-Za-z0-9_]{1,15})\b/g) ?? []).map(
      (m) => m.trim()
    ),
  ]);

  const linkedin = unique(
    urlHaystack
      .filter((u) => /linkedin\.com\/(?:in|company)\//i.test(u))
      .map((u) => u.split(/[?#]/)[0]!)
  );

  const github = unique(
    urlHaystack
      .filter((u) => /github\.com\/[^/]+/i.test(u) && !/github\.com\/features/i.test(u))
      .map((u) => u.split(/[?#]/)[0]!)
  );

  const youtube = unique(
    urlHaystack
      .filter((u) => /(?:youtube\.com|youtu\.be)/i.test(u))
      .map((u) => u.split(/[?#]/)[0]!)
  );

  const substack = unique(
    urlHaystack
      .filter((u) => /substack\.com/i.test(u))
      .map((u) => u.split(/[?#]/)[0]!)
  );

  const mastodon = unique(
    urlHaystack.filter(
      (u) =>
        /mastodon\./i.test(u) ||
        /@[^@]+\@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text) ||
        /bsky\.app\/profile\//i.test(u)
    )
  );

  const websites = unique(
    urlHaystack.filter((u) => {
      try {
        const host = new URL(u).hostname;
        return !SOCIAL_HOSTS.test(host) && !/mailto:/i.test(u);
      } catch {
        return false;
      }
    })
  );

  return {
    emails,
    twitter,
    linkedin,
    github,
    youtube,
    substack,
    mastodon,
    websites,
  };
}

export function mergeContactInfo(...parts: Partial<ContactInfo>[]): ContactInfo {
  const merged = { ...EMPTY_CONTACT };
  for (const part of parts) {
    for (const key of Object.keys(merged) as (keyof ContactInfo)[]) {
      merged[key] = unique([...merged[key], ...(part[key] ?? [])]);
    }
  }
  return merged;
}

export function contactInfoHasData(info: ContactInfo): boolean {
  return Object.values(info).some((arr) => arr.length > 0);
}

/** Prefer LinkedIn, then Twitter, then primary site, then email mailto. */
export function bestContactProfileUrl(
  contact: ContactInfo,
  fallback?: string | null
): string | null {
  if (contact.linkedin[0]) return contact.linkedin[0];
  if (contact.twitter[0]) {
    const handle = contact.twitter[0].replace(/^@/, "");
    return `https://twitter.com/${handle}`;
  }
  if (contact.github[0]) return contact.github[0];
  if (contact.youtube[0]) return contact.youtube[0];
  if (contact.substack[0]) return contact.substack[0];
  if (contact.websites[0]) return contact.websites[0];
  if (contact.emails[0]) return `mailto:${contact.emails[0]}`;
  return fallback ?? null;
}

export function bestContactHandle(
  contact: ContactInfo,
  fallback?: string | null
): string | null {
  if (contact.twitter[0]) return contact.twitter[0];
  if (contact.linkedin[0]) {
    const m = contact.linkedin[0].match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (m?.[1]) return m[1];
  }
  if (contact.emails[0]) return contact.emails[0];
  return fallback ?? null;
}
