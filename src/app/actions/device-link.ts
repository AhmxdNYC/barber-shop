"use server";

import { requireBarber } from "@/lib/auth/current-user";
import { issueDeviceLink } from "@/lib/auth/magic-link";
import { qrSvg, SITE_URL } from "@/lib/qr";

/**
 * Generates a sign-in code for a second device.
 *
 * Only callable by an already-signed-in barber — the existing session is
 * what authorises the new device, exactly as linking a desktop messaging
 * client works. There is no path from the public site to this.
 */
export type DeviceLinkCode = {
  svg: string;
  url: string;
  expiresInSeconds: number;
};

export async function createDeviceLinkAction(): Promise<DeviceLinkCode> {
  const barber = await requireBarber();

  const issued = await issueDeviceLink(barber.email);
  if (!issued) throw new Error("Could not create a sign-in code.");

  const url = `${SITE_URL}/login/verify?token=${issued.token}`;

  return {
    // Higher error correction, because this is scanned off a screen at an
    // angle rather than from clean print.
    svg: await qrSvg(url, { margin: 1 }),
    url,
    expiresInSeconds: issued.expiresInSeconds,
  };
}
