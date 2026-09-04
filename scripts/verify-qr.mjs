/**
 * Decodes the generated QR code and checks it resolves to the expected URL.
 *
 * A printed QR code cannot be corrected after the fact, so this runs the
 * code back through a real decoder rather than trusting the generator.
 */
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const url =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://eduardobarbershop.vercel.app";

const buf = await QRCode.toBuffer(url, {
  errorCorrectionLevel: "H",
  margin: 1,
  width: 512,
  color: { dark: "#000000", light: "#FFFFFF" },
});

const png = PNG.sync.read(buf);
const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (!decoded) {
  console.error("FAIL: the generated code could not be decoded at all.");
  process.exit(1);
}
if (decoded.data !== url) {
  console.error(`FAIL: decoded to "${decoded.data}", expected "${url}".`);
  process.exit(1);
}

console.log("PASS — QR decodes correctly");
console.log("  encoded : " + url);
console.log("  decoded : " + decoded.data);
console.log("  version : " + decoded.version + "  (error correction H, ~30% recoverable)");
