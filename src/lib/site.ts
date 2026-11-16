import {
  getEmDashCollection,
  getSiteSettings,
  getTaxonomyTermsWithCacheHint,
} from "emdash";
import type { TaxonomyTerm } from "emdash";

export const DEFAULT_TIMEZONE = "America/New_York";

export async function getHomepage() {
  const { entries, cacheHint } = await getEmDashCollection("homepage", {
    limit: 1,
  });
  return { home: entries[0] ?? null, cacheHint };
}

/** The soonest workshop that hasn't ended yet. */
export async function getNextWorkshop() {
  const { entries, cacheHint } = await getEmDashCollection("workshops", {
    orderBy: { starts_at: "asc" },
    limit: 20,
  });
  const now = Date.now();
  const workshop =
    entries.find((w) => {
      const end = w.data.ends_at ?? w.data.starts_at;
      return end && new Date(end).getTime() >= now;
    }) ?? null;
  return { workshop, cacheHint };
}

export async function getTimezone() {
  const settings = (await getSiteSettings()) as
    { timezone?: string } | undefined;
  return settings?.timezone || DEFAULT_TIMEZONE;
}

/** Splits "a *b* c" into segments so editors can emphasize words without HTML. */
export function emphasis(text: string | null | undefined) {
  return (text ?? "")
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) =>
      part.length > 2 && part.startsWith("*") && part.endsWith("*")
        ? { text: part.slice(1, -1), em: true }
        : { text: part, em: false },
    );
}

type PTBlock = {
  _type?: string;
  style?: string;
  children?: { text?: string }[];
};

export function blockText(block: PTBlock) {
  return (block.children ?? []).map((c) => c.text ?? "").join("");
}

export function readMinutes(content: PTBlock[] | null | undefined) {
  const words = (content ?? [])
    .map(blockText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function headingId(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/^\d+\.\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "section"
  );
}

/** Splits "3. Heading" into its number and text. */
export function splitNumbered(text: string) {
  const m = text.match(/^(\d+)\.\s*(.*)$/);
  return m ? { n: `${m[1]}.`, text: m[2] } : { n: null, text };
}

export function headings(content: PTBlock[] | null | undefined) {
  return (content ?? [])
    .filter((b) => b._type === "block" && b.style === "h2")
    .map((b) => {
      const text = blockText(b);
      return { id: headingId(text), label: splitNumbered(text).text };
    });
}

export function workshopParts(
  startsAt: Date | string,
  endsAt: Date | string | null | undefined,
  timeZone: string,
) {
  const start = new Date(startsAt);
  const fmt = (opts: Intl.DateTimeFormatOptions, d = start) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(d);
  const time = (d: Date) => fmt({ hour: "numeric", minute: "2-digit" }, d);
  return {
    month: fmt({ month: "short" }).toUpperCase(),
    day: fmt({ day: "2-digit" }),
    weekday: fmt({ weekday: "long" }),
    shortDate: fmt({ month: "short", day: "numeric" }),
    timeRange: endsAt
      ? `${time(start)} – ${time(new Date(endsAt))}`
      : time(start),
  };
}

export function telHref(phone: string | null | undefined) {
  return `tel:${(phone ?? "").replace(/[^\d+]/g, "")}`;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Parses YouTube watch, youtu.be, embed and Shorts links. */
export function youtubeVideo(
  url: unknown,
): { id: string; short: boolean } | null {
  if (typeof url !== "string" || !URL.canParse(url)) return null;
  const u = new URL(url);
  const host = u.hostname.replace(/^(www|m)\./, "");
  const [first, second] = u.pathname.split("/").filter(Boolean);
  const id =
    host === "youtu.be"
      ? first
      : host !== "youtube.com"
        ? null
        : first === "watch"
          ? u.searchParams.get("v")
          : ["embed", "shorts"].includes(first)
            ? second
            : null;
  return id && YOUTUBE_ID.test(id)
    ? { id, short: host === "youtube.com" && first === "shorts" }
    : null;
}

const SHORTCODE = /^\s*\[([a-z][a-z-]*)(?:\s+([\w-]+))?\]\s*$/;

export type BodySegment<T> =
  | { kind: "blocks"; blocks: T[] }
  | { kind: "shortcode"; name: string; arg?: string };

/**
 * Splits Portable Text at paragraphs that contain only a shortcode such as
 * `[equity-calculator]` or `[market-chart median-price]`, so editors can place
 * interactive tools anywhere in a page.
 */
export function splitShortcodes<T extends PTBlock>(
  content: T[] | null | undefined,
): BodySegment<T>[] {
  const segments: BodySegment<T>[] = [];
  for (const block of content ?? []) {
    const match =
      block._type === "block" && (block.style ?? "normal") === "normal"
        ? blockText(block).match(SHORTCODE)
        : null;
    const last = segments.at(-1);
    if (match) {
      segments.push({ kind: "shortcode", name: match[1], arg: match[2] });
    } else if (last?.kind === "blocks") {
      last.blocks.push(block);
    } else {
      segments.push({ kind: "blocks", blocks: [block] });
    }
  }
  return segments;
}

/** Public URL for an image field value (local media or external). */
export function imageUrl(
  image:
    { src?: string; meta?: { storageKey?: string } | null } | null | undefined,
) {
  if (image?.src) return image.src;
  const key = image?.meta?.storageKey;
  return key ? `/_emdash/api/media/file/${key}` : null;
}

/** Posts in a category including its subcategories (may double-count posts filed in both). */
export function topicTotal(term: TaxonomyTerm): number {
  return (
    (term.count ?? 0) +
    term.children.reduce((sum, child) => sum + topicTotal(child), 0)
  );
}

/** Depth-first search of a category tree by slug. */
export function findTopic(
  terms: TaxonomyTerm[],
  slug: string,
): TaxonomyTerm | undefined {
  for (const term of terms) {
    if (term.slug === slug) return term;
    const child = findTopic(term.children, slug);
    if (child) return child;
  }
}

/** A category's slug plus all its descendants' slugs, for `where` filters. */
export function topicSlugs(term: TaxonomyTerm): string[] {
  return [term.slug, ...term.children.flatMap(topicSlugs)];
}

/** Busiest-first top-level topics, used when no featured topics are chosen. */
const BUSIEST_TOPIC_COUNT = 4;

/**
 * Data for the homepage Learning Center block: the featured topic chips
 * (homepage `featured_topics`, matched by label or slug) and the articles for
 * the selected topic (or all articles when none is selected).
 */
export async function getHomeArticles(topicSlug?: string) {
  const [{ home, cacheHint: homeHint }, topicsResult] = await Promise.all([
    getHomepage(),
    getTaxonomyTermsWithCacheHint("category"),
  ]);
  const tree = topicsResult.data;
  const flat = (terms: TaxonomyTerm[]): TaxonomyTerm[] =>
    terms.flatMap((t) => [t, ...flat(t.children)]);
  const key = (v: string) => v.trim().toLowerCase();
  const chosen = (home?.data.featured_topics ?? [])
    .map((name) =>
      flat(tree).find(
        (t) => key(t.label) === key(name) || t.slug === key(name),
      ),
    )
    .filter((t): t is TaxonomyTerm => !!t && topicTotal(t) > 0);
  const topics = chosen.length
    ? chosen
    : tree
        .filter((t) => topicTotal(t) > 0)
        .toSorted((a, b) => topicTotal(b) - topicTotal(a))
        .slice(0, BUSIEST_TOPIC_COUNT);

  const topic = topicSlug ? findTopic(tree, topicSlug) : undefined;
  const { entries, cacheHint } = await getEmDashCollection("posts", {
    orderBy: { published_at: "desc" },
    limit: 12,
    where: topic ? { category: topicSlugs(topic) } : {},
  });
  const lead = entries.find((a) => a.data.featured) ?? entries[0];
  return {
    topics,
    topic,
    lead,
    more: entries.filter((a) => a !== lead).slice(0, 3),
    cacheHints: [homeHint, topicsResult.cacheHint, cacheHint],
  };
}
