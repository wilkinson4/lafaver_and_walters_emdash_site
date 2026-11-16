/**
 * Lead forms: receives the site's contact / guide / home-value forms, keeps a
 * copy in plugin storage, and emails each submission to the team.
 *
 * Public route: POST /_emdash/api/plugins/lead-forms/submit
 */
import { z } from "astro/zod";
import { definePlugin, PluginRouteError } from "emdash";

export interface LeadFormsOptions {
  /** Where submissions are emailed. */
  to: string;
  /** Max submissions per IP address per hour. */
  hourlyLimit?: number;
}

const FORMS = {
  contact: "Free consultation request",
  guide: "Free guide request",
  "home-value": "Home value request",
} as const;

const text = (max: number) => z.string().trim().max(max).optional();

const submission = z.object({
  form: z.enum(Object.keys(FORMS) as [keyof typeof FORMS]),
  name: text(120),
  email: text(200),
  phone: text(40),
  contact: text(200),
  address: text(300),
  topic: text(120),
  pref: text(20),
  message: text(4000),
  page: text(500),
  /** Honeypot: hidden from people, filled in by bots. */
  website: text(200),
});

type Fields = Omit<z.infer<typeof submission>, "website">;

const LABELS: [keyof Fields, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["contact", "Email or phone"],
  ["address", "Home address"],
  ["topic", "Thinking about"],
  ["pref", "Best way to reach"],
  ["message", "Message"],
  ["page", "Sent from"],
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createPlugin(options: LeadFormsOptions) {
  const hourlyLimit = options.hourlyLimit ?? 10;

  return definePlugin({
    id: "lead-forms",
    version: "1.0.0",
    displayName: "Lead Forms",
    description: "Stores website form submissions and emails them to the team.",
    capabilities: ["email:send"],
    storage: {
      submissions: { indexes: ["form", "createdAt"] },
    },
    routes: {
      submit: {
        public: true,
        input: submission,
        handler: async (ctx) => {
          const { website, ...fields } = ctx.input as z.infer<
            typeof submission
          >;
          // Pretend success so bots don't retry.
          if (website) return { ok: true };

          if (!fields.email && !fields.phone && !fields.contact) {
            throw PluginRouteError.badRequest(
              "Please include an email address or phone number.",
            );
          }
          if (fields.email && !EMAIL.test(fields.email)) {
            throw PluginRouteError.badRequest(
              "Please enter a valid email address.",
            );
          }

          const ip = ctx.requestMeta.ip;
          if (ip) {
            const key = `rate:${ip}:${new Date().toISOString().slice(0, 13)}`;
            const count = (await ctx.kv.get<number>(key)) ?? 0;
            if (count >= hourlyLimit) {
              throw new PluginRouteError(
                "RATE_LIMITED",
                "Too many submissions. Please call or text us instead.",
                429,
              );
            }
            await ctx.kv.set(key, count + 1);
          }

          const createdAt = new Date().toISOString();
          await ctx.storage.submissions.put(crypto.randomUUID(), {
            ...fields,
            createdAt,
          });

          const lines = LABELS.filter(([key]) => fields[key]).map(
            ([key, label]) => `${label}: ${fields[key]}`,
          );
          const replyTo = [fields.email, fields.contact].find(
            (v) => v && EMAIL.test(v),
          );
          const who =
            fields.name ||
            replyTo ||
            fields.phone ||
            fields.contact ||
            "website visitor";

          if (ctx.email) {
            try {
              await ctx.email.send({
                to: options.to,
                replyTo,
                subject: `${FORMS[fields.form]} from ${who}`,
                text: `${FORMS[fields.form]}\n\n${lines.join("\n")}\n\nReceived ${createdAt}`,
              });
            } catch (error) {
              // The submission is already saved; don't make the visitor retry.
              ctx.log.error("Failed to email lead", error);
            }
          } else {
            ctx.log.warn(
              "No email provider configured; lead saved to storage only.",
            );
          }

          return { ok: true };
        },
      },
    },
  });
}
