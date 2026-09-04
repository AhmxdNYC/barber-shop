import QRCode from "qrcode";

/**
 * The URL a scanned code opens.
 *
 * A printed QR code is permanent — once it is on the window, the URL it
 * encodes can never change. Keep this pointed at the final address before
 * anything goes to a printer.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduardobarbershop.vercel.app";

/**
 * Renders a QR code as an inline SVG string.
 *
 * Error correction is set to "H" (~30% of the code recoverable), which is
 * the level that tolerates a mark over the centre and, more usefully here,
 * survives print smudging, glare through a shop window, and a scuffed
 * sticker. Generated locally at build time — no QR web service involved,
 * so nothing breaks if a third party disappears.
 */
export async function qrSvg(
  data: string = SITE_URL,
  opts: { margin?: number } = {},
): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: opts.margin ?? 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
