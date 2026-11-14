import { getEmDashCollection, getSiteSettings } from "emdash";

export const DEFAULT_TIMEZONE = "America/Chicago";

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
