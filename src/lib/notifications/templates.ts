import { SHOP, ADDRESS_LINE, formatPrice } from "@/lib/shop";
import type { OutboundMessage } from "./types";

/**
 * Message bodies.
 *
 * Plain text, not HTML. A barbershop confirmation is five facts and a link —
 * HTML would add rendering bugs across mail clients, spam-filter weight and
 * a build step, for no gain to the reader. Plain text also renders correctly
 * in every client, including the phone lock screen preview, which is where
 * most of these are actually read.
 */

export type BookingDetails = {
  clientName: string;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  priceCents: number;
  timeZone: string;
  /** Absolute URL carrying the guest capability token. */
  manageUrl: string;
  cancellationWindowHours: number;
};

function when(details: BookingDetails): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: details.timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(details.startsAt);
}

export function bookingConfirmed(details: BookingDetails): OutboundMessage {
  return {
    to: "",
    subject: `Booked: ${details.serviceName} on ${when(details)}`,
    body: [
      `Hi ${details.clientName},`,
      "",
      `You're booked in at ${SHOP.name}.`,
      "",
      `  ${when(details)}`,
      `  ${details.serviceName} with ${details.barberName}`,
      `  ${formatPrice(details.priceCents)}, paid in the shop`,
      "",
      ADDRESS_LINE,
      SHOP.phone,
      "",
      "Need to cancel? Use this link:",
      details.manageUrl,
      "",
      `Free to cancel more than ${details.cancellationWindowHours} hours ahead.`,
      "",
      "See you soon.",
    ].join("\n"),
  };
}

export function bookingReminder(details: BookingDetails): OutboundMessage {
  return {
    to: "",
    subject: `Tomorrow: ${details.serviceName} at ${new Intl.DateTimeFormat("en-US", {
      timeZone: details.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(details.startsAt)}`,
    body: [
      `Hi ${details.clientName},`,
      "",
      `Reminder — you're in tomorrow at ${SHOP.name}.`,
      "",
      `  ${when(details)}`,
      `  ${details.serviceName} with ${details.barberName}`,
      "",
      ADDRESS_LINE,
      "",
      "Can't make it? Let us know as early as you can so someone else can take the slot:",
      details.manageUrl,
    ].join("\n"),
  };
}

export function bookingCancelled(details: BookingDetails): OutboundMessage {
  return {
    to: "",
    subject: `Cancelled: ${details.serviceName} on ${when(details)}`,
    body: [
      `Hi ${details.clientName},`,
      "",
      "Your booking has been cancelled:",
      "",
      `  ${when(details)}`,
      `  ${details.serviceName} with ${details.barberName}`,
      "",
      "Book another time whenever you like — we'd be glad to see you.",
      "",
      `${SHOP.name}`,
      SHOP.phone,
    ].join("\n"),
  };
}


export function manageLinkResent(details: BookingDetails): OutboundMessage {
  return {
    to: "",
    subject: `Your booking at ${SHOP.name}`,
    body: [
      `Hi ${details.clientName},`,
      "",
      "Here's the link to your booking:",
      "",
      details.manageUrl,
      "",
      `  ${when(details)}`,
      `  ${details.serviceName} with ${details.barberName}`,
      "",
      "Any link we sent you before has stopped working — use this one.",
      "",
      `${SHOP.name}`,
      SHOP.phone,
    ].join("\n"),
  };
}


/** Sign-in link for a barber. Short-lived and single use. */
export function barberSignInLink(options: {
  name: string;
  url: string;
  expiryMinutes: number;
}): OutboundMessage {
  return {
    to: "",
    subject: `Sign in to ${SHOP.name}`,
    body: [
      `Hi ${options.name},`,
      "",
      "Tap here to sign in:",
      "",
      options.url,
      "",
      `This link works once and expires in ${options.expiryMinutes} minutes.`,
      "You'll stay signed in on this phone for a month afterwards.",
      "",
      "If you didn't ask for this, ignore it — nothing has changed.",
    ].join("\n"),
  };
}
