/**
 * The seam between "something happened" and "a message went out".
 *
 * Same shape as the booking provider: the code that books never learns which
 * service delivers the email, so switching from the console transport to
 * Resend — or adding Twilio SMS — is configuration rather than a refactor.
 */

export type NotificationChannel = "EMAIL" | "SMS";

export type OutboundMessage = {
  to: string;
  subject: string;
  /** Plain text. Deliberately not HTML — see docs. */
  body: string;
};

export type DeliveryResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string };

export interface NotificationTransport {
  readonly id: string;
  readonly channel: NotificationChannel;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}
