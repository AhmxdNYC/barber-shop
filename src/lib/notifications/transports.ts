import type { NotificationTransport, OutboundMessage } from "./types";

/**
 * Writes the message to the server log instead of sending it.
 *
 * The default, so the whole notification path — templates, the outbox rows,
 * the failure handling — is exercised in development without an account
 * anywhere or a verified sending domain. Nothing is stubbed out except the
 * final hop.
 */
export const consoleTransport: NotificationTransport = {
  id: "console",
  channel: "EMAIL",
  async send(message: OutboundMessage) {
    console.info(
      [
        "",
        "──────── email (not actually sent) ────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.body,
        "───────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
};

/**
 * Resend. Switched on by setting RESEND_API_KEY and EMAIL_FROM.
 *
 * Uses fetch rather than the SDK: one HTTP call, no dependency, and nothing
 * to keep in step with a major version.
 */
export function createResendTransport(config: {
  apiKey: string;
  from: string;
}): NotificationTransport {
  return {
    id: "resend",
    channel: "EMAIL",
    async send(message: OutboundMessage) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.from,
            to: [message.to],
            subject: message.subject,
            text: message.body,
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          return { ok: false, error: `Resend ${response.status}: ${detail.slice(0, 300)}` };
        }

        const data = (await response.json()) as { id?: string };
        return { ok: true, providerMessageId: data.id };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown send failure",
        };
      }
    },
  };
}

export function resolveTransport(): NotificationTransport {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) {
    return createResendTransport({ apiKey, from });
  }
  return consoleTransport;
}
