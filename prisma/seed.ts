import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SHOP, SERVICES, BARBERS, HOURS } from "../src/lib/shop";

/**
 * Seeds the database from src/lib/shop.ts.
 *
 * That file is the single place shop content is written, so seeding from it
 * keeps the database and the statically-rendered marketing pages telling the
 * same story. Idempotent — safe to re-run after editing the content.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await prisma.shopSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: SHOP.name,
      phone: SHOP.phone,
      email: SHOP.email || null,
      addressLine1: SHOP.address.line1,
      city: SHOP.address.city,
      state: SHOP.address.state,
      postalCode: SHOP.address.postalCode,
      depositCents: SHOP.depositCents,
      mapUrl: SHOP.mapUrl,
      instagramUrl: SHOP.instagram || null,
    },
    update: {
      name: SHOP.name,
      phone: SHOP.phone,
      addressLine1: SHOP.address.line1,
      city: SHOP.address.city,
    },
  });

  for (const [i, s] of SERVICES.entries()) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
        depositCents: SHOP.depositCents,
        sortOrder: i,
      },
      update: {
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
        sortOrder: i,
      },
    });
  }

  for (const [i, b] of BARBERS.entries()) {
    const barber = await prisma.barber.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug,
        name: b.name,
        nickname: b.nickname || null,
        specialty: b.specialty,
        bio: b.bio,
        yearsExperience: b.yearsExperience,
        photoUrl: b.photo,
        sortOrder: i,
      },
      update: { name: b.name, specialty: b.specialty, sortOrder: i },
    });

    // Every chair starts on the shop's published hours. Individual barbers
    // can diverge later from the dashboard.
    for (const day of HOURS) {
      const dayOfWeek = HOURS.indexOf(day);
      await prisma.workingHours.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek } },
        create: {
          barberId: barber.id,
          dayOfWeek,
          opensAtMinutes: day.opens ?? 0,
          closesAtMinutes: day.closes ?? 0,
          isClosed: day.opens === null,
        },
        update: {
          opensAtMinutes: day.opens ?? 0,
          closesAtMinutes: day.closes ?? 0,
          isClosed: day.opens === null,
        },
      });
    }
  }

  const [services, barbers] = await Promise.all([
    prisma.service.count(),
    prisma.barber.count(),
  ]);
  console.log(`Seeded ${barbers} barbers and ${services} services.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
