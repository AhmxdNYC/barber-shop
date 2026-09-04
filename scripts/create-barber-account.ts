import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

/**
 * Creates or updates a barber login.
 *
 *   npm run account:create -- eduardo@example.com "Eduardo"
 *
 * There is no signup page by design (see docs/AUTH-DECISION.md), so accounts
 * are made here. Omitting the password generates a strong one and prints it
 * once — it is stored only as a scrypt hash and cannot be recovered.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [emailArg, nameArg, passwordArg] = process.argv.slice(2);
  if (!emailArg) {
    console.error(
      'Usage: npm run account:create -- <email> "<name>" [password]',
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const name = nameArg?.trim() || "Barber";
  const password = passwordArg ?? randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: "OWNER" },
    update: { name, passwordHash, role: "OWNER" },
  });

  // Link the login to the barber's chair, if one matches by name.
  const barber = await prisma.barber.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (barber && !barber.userId) {
    await prisma.barber.update({
      where: { id: barber.id },
      data: { userId: user.id },
    });
  }

  console.log(`\nAccount ready for ${email}`);
  if (!passwordArg) {
    console.log(`Password: ${password}`);
    console.log("Shown once — it is stored only as a hash. Save it now.\n");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
