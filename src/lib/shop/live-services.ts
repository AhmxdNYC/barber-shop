import "server-only";
import { prisma } from "@/lib/db/client";
import type { Service } from "./services";

/**
 * The live service menu.
 *
 * The hardcoded SERVICES array is now only the seed. Reading it at runtime
 * meant the barber could change a price in the dashboard and the website
 * would keep advertising the old one — the same class of bug as the hours,
 * and worse, because it is about money.
 */
export async function liveServices(): Promise<Service[]> {
  const rows = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
  }));
}
